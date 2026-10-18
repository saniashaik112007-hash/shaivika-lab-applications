"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // CURRENT YEAR
    // =====================================

    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    const applicationDialog = document.getElementById("application");
    const openApplicationButton = document.getElementById("openApplicationForm");
    const closeApplicationButton = document.querySelector(".application-dialog-close");

    if (
        applicationDialog instanceof HTMLDialogElement &&
        openApplicationButton instanceof HTMLButtonElement &&
        closeApplicationButton instanceof HTMLButtonElement
    ) {
        openApplicationButton.addEventListener("click", () => {
            applicationDialog.showModal();
            applicationDialog.querySelectorAll(".reveal").forEach((element) => {
                element.classList.add("visible");
            });
        });

        closeApplicationButton.addEventListener("click", () => {
            applicationDialog.close();
        });
    }


    // =====================================
    // SCROLL REVEAL ANIMATIONS
    // =====================================

    const revealElements = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {

        const revealObserver = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach((entry) => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("visible");

                        observer.unobserve(entry.target);
                    }

                });

            },
            {
                threshold: 0.12
            }
        );

        revealElements.forEach((element) => {
            revealObserver.observe(element);
        });

    } else {

        revealElements.forEach((element) => {
            element.classList.add("visible");
        });

    }


    // =====================================
    // APPLICATION FORM
    // =====================================

    const form = document.getElementById("applicationForm");
    const submitButton = document.getElementById("submitButton");
    const formMessage = document.getElementById("formMessage");

    if (!form || !submitButton || !formMessage) {
        return;
    }


    // Validate optional profile URLs.
    function isValidOptionalUrl(value) {

        if (!value.trim()) {
            return true;
        }

        try {

            const parsedUrl = new URL(value);

            return (
                parsedUrl.protocol === "https:" ||
                parsedUrl.protocol === "http:"
            );

        } catch {

            return false;
        }

    }


    // Show feedback to the candidate.
    function showMessage(message, type) {

        formMessage.textContent = message;

        formMessage.className = "form-message " + type;

    }


    // =====================================
    // FORM SUBMISSION
    // =====================================

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIlozq47bRIgX3S_FSL69NvfyrEIW29dc4AZeqMy8O2yg1T8AWdu9bPZCwvx7Si1cf/exec";
    form.addEventListener("submit", async (event) => {
    event.preventDefault();

    formMessage.textContent = "";
    formMessage.className = "form-message";

    // Validate required fields
    if (!form.checkValidity()) {
        form.reportValidity();

        showMessage(
            "Please complete all required fields before submitting.",
            "error"
        );
        return;
    }

    // Validate phone number
    const phoneInput = document.getElementById("phone");
    const phone = phoneInput.value.trim();
    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        showMessage("Please enter a valid phone number.", "error");
        phoneInput.focus();
        return;
    }

    // Validate optional profile URLs
    const profileFields = [
        { id: "github", label: "GitHub profile" },
        { id: "linkedin", label: "LinkedIn profile" },
        { id: "portfolio", label: "Portfolio URL" }
    ];

    for (const field of profileFields) {
        const input = document.getElementById(field.id);

        if (input && !isValidOptionalUrl(input.value)) {
            showMessage(
                "Please enter a valid URL for " + field.label + ".",
                "error"
            );

            input.focus();
            return;
        }
    }

    // Get resume file
    const resumeInput = document.getElementById("resume");
    const resume = resumeInput.files[0];

    if (!resume) {
        showMessage("Please upload your resume.", "error");
        resumeInput.focus();
        return;
    }

    // Validate PDF format
    if (
        resume.type !== "application/pdf" ||
        !resume.name.toLowerCase().endsWith(".pdf")
    ) {
        showMessage("Please upload a PDF file only.", "error");
        resumeInput.focus();
        return;
    }

    // Maximum resume size: 10 MB
    const MAX_RESUME_SIZE = 10 * 1024 * 1024;

    if (resume.size > MAX_RESUME_SIZE) {
        showMessage(
            "Your resume must not exceed 10 MB.",
            "error"
        );
        resumeInput.focus();
        return;
    }

    // Disable submit button
    submitButton.disabled = true;

    const buttonText = submitButton.querySelector("span");
    const originalButtonText = buttonText
        ? buttonText.textContent
        : "Submit Application";

    if (buttonText) {
        buttonText.textContent = "Preparing Resume...";
    }

    try {
        // Convert PDF into Base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const result = reader.result;
                resolve(result.split(",")[1]);
            };

            reader.onerror = () => {
                reject(new Error("Unable to read the resume file."));
            };

            reader.readAsDataURL(resume);
        });

        // Collect every named form field so the payload stays aligned with the
        // current HTML form without silently dropping newer fields.
        const application = Object.fromEntries(new FormData(form));
        application.phone = phone;
        application.phoneLocation = [application.phone, application.location]
            .filter(Boolean)
            .join(" / ");
        application.declaration = form.elements.declaration.checked ? "Accepted" : "";

        // The deployed Apps Script expects these canonical fields. Preserve
        // every original form value while deriving the backend fields from the
        // existing controls, so the UI and spreadsheet schema do not change.
        application.occupation = [
            application.college,
            application.education,
            application.degree
        ].filter(Boolean).join(" | ");
        application.skills = [
            application.projectStatus,
            application.buildingInterest,
            application.projectLink
        ].filter(Boolean).join(" | ");

        application.resumeFile = {
            name: resume.name,
            mimeType: resume.type || "application/pdf",
            size: resume.size,
            base64
        };
        application.submittedAt = new Date().toISOString();
        application.company = "Shaivika Groups";
        application.division = "Shaivika Labs";

        if (buttonText) {
            buttonText.textContent = "Submitting Application...";
        }

    // Send application to Google Apps Script
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, 20000);
    let response;
    try {
    response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: new URLSearchParams({
            payload: JSON.stringify(application)
        }),
        signal: controller.signal
    });
} finally {
    clearTimeout(timeoutId);
}

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error("The application service returned an invalid response.");
        }

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Application submission failed."
            );
        }

        // Show success message
        showMessage(
            "Application submitted successfully! Your Application ID is " +
                result.applicationId,
            "success"
        );

        // Reset form after successful submission
        form.reset();

    }  catch (error) {
    console.error("Application submission error:", error);

    if (error.name === "AbortError") {
        showMessage(
            "The request timed out. Please check whether your application was submitted before trying again.",
            "error"
        );
    } else {
        showMessage(
            error.message || "An unexpected error occurred.",
            "error"
        );
    }

} finally {
        submitButton.disabled = false;

        if (buttonText) {
            buttonText.textContent = originalButtonText;
        }
    }
});

});

// ==========================================
// SHAIVIKA LABS APPLICATION POPUP
// ==========================================

const openApplication = document.getElementById("openApplication");
const applicationModal = document.getElementById("applicationModal");
const closeApplication = document.getElementById("closeApplication");
const closeModalOverlay = document.getElementById("closeModalOverlay");

function openForm() {
    applicationModal.classList.add("active");
    document.body.classList.add("modal-open");
}

function closeForm() {
    applicationModal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

if (openApplication && applicationModal) {
    openApplication.addEventListener("click", openForm);
}

if (closeApplication) {
    closeApplication.addEventListener("click", closeForm);
}

if (closeModalOverlay) {
    closeModalOverlay.addEventListener("click", closeForm);
}

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && applicationModal) {
        closeForm();
    }
});

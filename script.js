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

    const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzDyWYopApE_zcB2RKolVclltsiGj5EDo8u6P52mOKhWq2DBGpqTb869uXZP6jKmxwb/exec";
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

        // Collect application details
const application = {
    name: document.getElementById("name").value.trim(),

    phoneLocation:
        document.getElementById("phone").value.trim() +
        " / " +
        document.getElementById("location").value.trim(),

    email: document.getElementById("email").value.trim(),

    occupation:
        document.getElementById("college").value.trim() +
        " | " +
        document.getElementById("education").value +
        " | " +
        document.getElementById("degree").value.trim(),

    role: document.getElementById("role").value,

    skills:
        "Project Status: " +
        document.getElementById("projectStatus").value +
        " | GitHub: " +
        document.getElementById("github").value.trim() +
        " | Best Project: " +
        document.getElementById("projectLink").value.trim() +
        " | Motivation: " +
        document.getElementById("motivation").value.trim() +
        " | Building Interest: " +
        document.getElementById("buildingInterest").value.trim() +
        " | Weekly Availability: " +
        document.getElementById("availability").value +
        " | Start Date: " +
        document.getElementById("startDate").value +
        " | Teamwork: " +
        document.getElementById("teamwork").value,

    experienceLevel:
        document.getElementById("experienceLevel").value,

    github: document.getElementById("github").value.trim(),

    linkedin: document.getElementById("linkedin").value.trim(),

    portfolio: document.getElementById("portfolio").value.trim(),

    relevantExperience:
        document.getElementById("relevantExperience").value.trim() +
        "\n\nWhy Join Shaivika Labs:\n" +
        document.getElementById("motivation").value.trim() +
        "\n\nInterested in Building:\n" +
        document.getElementById("buildingInterest").value.trim(),

    resumeFile: {
        name: resume.name,
        mimeType: resume.type,
        base64: base64
    },

    submittedAt: new Date().toISOString(),

    company: "Shaivika Groups",

    division: "Shaivika Labs"
};

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

        const result = await response.json();

        if (!result.success) {
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
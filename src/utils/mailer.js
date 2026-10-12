import nodemailer from 'nodemailer';

/**
 * Creates and returns the configured Nodemailer transporter
 */
export const getTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Sends notification emails when a new admission form is submitted.
 * 1. Alerts Admin with student application details.
 * 2. (Optional) Sends confirmation acknowledgement to student if email was provided.
 *
 * @param {Object} params
 * @param {Object} params.admission - The created admission document
 * @param {string} params.courseName - The name of the selected course
 */
export const sendNewAdmissionEmail = async ({ admission, courseName }) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Mailer] SMTP credentials not set. Skipping admission email notification.');
      return;
    }

    const transporter = getTransporter();
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;
    const fromAddress = `"College Admissions" <${process.env.SMTP_USER}>`;

    const formattedDob = admission.dob
      ? new Date(admission.dob).toLocaleDateString('en-GB')
      : 'Not provided';

    // 1. Email to Admin
    const adminMailOptions = {
      from: fromAddress,
      to: adminEmail,
      subject: `🎓 New Admission Application: ${admission.name} (${courseName})`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1a365d; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 20px;">New Student Admission Submitted</h2>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 15px;">A new admission form has been submitted with the following details:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold; width: 35%;">Applicant Name:</td>
                <td style="padding: 10px 0;">${admission.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Course Applied:</td>
                <td style="padding: 10px 0; color: #2b6cb0; font-weight: bold;">${courseName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Phone Number:</td>
                <td style="padding: 10px 0;">${admission.phone}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Email:</td>
                <td style="padding: 10px 0;">${admission.email || 'Not provided'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Guardian Name:</td>
                <td style="padding: 10px 0;">${admission.guardianName || 'Not provided'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Date of Birth:</td>
                <td style="padding: 10px 0;">${formattedDob}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Address:</td>
                <td style="padding: 10px 0;">${admission.address || 'Not provided'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold;">Application ID:</td>
                <td style="padding: 10px 0; font-family: monospace;">${admission._id}</td>
              </tr>
            </table>
            <div style="margin-top: 25px; text-align: center;">
              <p style="font-size: 13px; color: #718096;">Log in to the College Admin Portal to review, approve, or assign a batch to this student.</p>
            </div>
          </div>
        </div>
      `,
    };

    const emailPromises = [transporter.sendMail(adminMailOptions)];

    // 2. Email confirmation to Student (if email provided)
    if (admission.email) {
      const studentMailOptions = {
        from: fromAddress,
        to: admission.email,
        subject: `Application Received: ${courseName} - College Portal`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2b6cb0; color: #ffffff; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px;">Application Received</h2>
            </div>
            <div style="padding: 24px;">
              <p style="font-size: 15px;">Dear <strong>${admission.name}</strong>,</p>
              <p style="font-size: 15px;">
                Thank you for applying for <strong>${courseName}</strong>. We have received your application successfully.
              </p>
              <div style="background-color: #f7fafc; border-left: 4px solid #2b6cb0; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Application ID:</strong> ${admission._id}</p>
                <p style="margin: 4px 0;"><strong>Course:</strong> ${courseName}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Pending Review</p>
              </div>
              <p style="font-size: 14px; color: #4a5568;">
                Our admissions committee is currently reviewing your application. You will be notified once your admission is approved and your batch is assigned.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #a0aec0; text-align: center;">
                This is an automated notification. If you have questions, please reach out to the admissions office.
              </p>
            </div>
          </div>
        `,
      };
      emailPromises.push(transporter.sendMail(studentMailOptions));
    }

    await Promise.all(emailPromises);
    console.log(`[Mailer] Admission notification email(s) sent successfully for ${admission.name}`);
  } catch (error) {
    console.error('[Mailer Error] Failed to send admission email:', error.message);
  }
};

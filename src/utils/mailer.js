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

/**
 * Sends a congratulations email to the student when their admission is approved.
 * Includes student login ID, temporary password, mandatory password change notice,
 * course & batch information, and WhatsApp contact details.
 *
 * @param {Object} params
 * @param {string} params.studentName
 * @param {string} params.studentEmail
 * @param {string} params.studentId
 * @param {string|null} params.password
 * @param {string} params.courseName
 * @param {string} params.batchName
 * @param {boolean} [params.reusedAccount=false]
 */
export const sendAdmissionApprovalEmail = async ({
  studentName,
  studentEmail,
  studentId,
  password,
  courseName,
  batchName,
  reusedAccount = false,
}) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Mailer] SMTP credentials not set. Skipping approval email.');
      return;
    }

    if (!studentEmail) {
      console.warn('[Mailer] No student email provided. Skipping approval email.');
      return;
    }

    const transporter = getTransporter();
    const fromAddress = `"College Admissions" <${process.env.SMTP_USER}>`;
    const rawWhatsapp = process.env.WHATSAPP_SUPPORT_NUMBER || '+91 75056 11253';
    let cleanDigits = rawWhatsapp.replace(/[^0-9]/g, '');
    if (cleanDigits.length === 10) {
      cleanDigits = '91' + cleanDigits;
    }
    const whatsappDisplay = rawWhatsapp.startsWith('+') ? rawWhatsapp : `+91 ${cleanDigits.slice(2)}`;
    const whatsappLink = `https://wa.me/${cleanDigits}?text=${encodeURIComponent(
      `Hello, my name is ${studentName} (Student ID: ${studentId}). I have a query regarding my admission in ${courseName}.`
    )}`;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const loginUrl = `${clientUrl}/student/login`;

    const credentialsSection = reusedAccount
      ? `
        <div style="background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #2b6cb0; font-weight: bold;">Login Credentials:</p>
          <p style="margin: 4px 0;"><strong>Student ID / Login ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #1a365d; font-weight: bold;">${studentId}</span></p>
          <p style="margin: 4px 0;"><strong>Password:</strong> Please use your existing account password.</p>
        </div>
      `
      : `
        <div style="background-color: #ebf8ff; border: 1px solid #bee3f8; border-radius: 6px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #2b6cb0; font-weight: bold;">Your Login Credentials:</p>
          <p style="margin: 4px 0;"><strong>Student ID / Login ID:</strong> <span style="font-family: monospace; font-size: 16px; color: #1a365d; font-weight: bold;">${studentId}</span></p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-size: 16px; color: #c53030; font-weight: bold; background: #fff5f5; padding: 2px 6px; border-radius: 4px;">${password}</span></p>
        </div>

        <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 14px 16px; margin: 20px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0; font-size: 14px; color: #c05621; font-weight: bold;">⚠️ Mandatory Password Change:</p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #7b341e; line-height: 1.5;">
            For account security, <strong>changing your password after logging in is required</strong>. You must set your new permanent password before accessing the student panel and joining live classes.
          </p>
        </div>
      `;

    const mailOptions = {
      from: fromAddress,
      to: studentEmail,
      subject: `🎉 Congratulations! Your Admission is Approved - ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2d3748; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1a365d; color: #ffffff; padding: 25px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: bold;">🎉 Congratulations!</h1>
            <p style="margin: 8px 0 0 0; font-size: 15px; opacity: 0.9;">Your Admission Has Been Approved</p>
          </div>
          
          <div style="padding: 24px;">
            <p style="font-size: 15px;">Dear <strong>${studentName}</strong>,</p>
            <p style="font-size: 15px;">
              We are delighted to welcome you! Your application for <strong>${courseName}</strong> has been officially approved, and you have been successfully enrolled in <strong>${batchName}</strong>.
            </p>

            <div style="background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 6px; padding: 14px 16px; margin: 18px 0;">
              <p style="margin: 4px 0;"><strong>Course:</strong> ${courseName}</p>
              <p style="margin: 4px 0;"><strong>Enrolled Batch:</strong> ${batchName}</p>
              <p style="margin: 4px 0;"><strong>Enrollment Status:</strong> <span style="color: #38a169; font-weight: bold;">Active</span></p>
            </div>

            ${credentialsSection}

            <div style="text-align: center; margin: 25px 0;">
              <a href="${loginUrl}" style="background-color: #2b6cb0; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; font-size: 15px; display: inline-block;">
                Login to Student Portal
              </a>
            </div>

            <!-- WhatsApp Contact Section -->
            <div style="background-color: #f0fff4; border: 1px solid #c6f6d5; border-radius: 6px; padding: 16px; margin: 24px 0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #22543d; font-weight: bold;">💬 Have Questions or Need Help?</p>
              <p style="margin: 0 0 12px 0; font-size: 13px; color: #276749;">
                For more details, class schedule queries, or any assistance, please contact us on WhatsApp:
              </p>
              <a href="${whatsappLink}" style="background-color: #25D366; color: #ffffff; text-decoration: none; padding: 8px 18px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
                Chat on WhatsApp (${whatsappDisplay})
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #a0aec0; text-align: center; margin: 0;">
              College Academic Portal &bull; Please keep your login credentials confidential.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Admission approval email sent successfully to ${studentEmail} (${studentId})`);
  } catch (error) {
    console.error('[Mailer Error] Failed to send admission approval email:', error.message);
  }
};

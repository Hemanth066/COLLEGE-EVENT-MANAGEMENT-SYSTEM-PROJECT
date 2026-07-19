// Email Notification Service for CEM System
const nodemailer = require('nodemailer');

// Email configuration
// NOTE: For production, use environment variables for credentials
const emailConfig = {
  service: 'gmail', // You can use gmail, outlook, or any SMTP service
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-app-password'      // Replace with your app password
  }
};

// Create transporter
let transporter = null;

function initializeEmailService() {
  try {
    // Check if email is configured
    if (emailConfig.auth.user === 'your-email@gmail.com') {
      console.log('⚠️  Email service not configured. System will work without email notifications.');
      console.log('   To enable emails, edit emailService.js with your Gmail credentials.');
      return false;
    }
    
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Email service initialized');
    return true;
  } catch (error) {
    console.error('❌ Email service initialization failed:', error.message);
    console.log('⚠️  System will continue without email notifications.');
    return false;
  }
}

// Send registration confirmation email
async function sendRegistrationEmail(studentEmail, studentName, eventTitle, eventDate, eventTime, eventVenue) {
  if (!transporter) {
    console.log('⚠️  Email service not configured. Skipping email notification.');
    return { success: false, message: 'Email service not configured' };
  }

  const mailOptions = {
    from: emailConfig.auth.user,
    to: studentEmail,
    subject: `✅ Registration Confirmed - ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #2563eb; margin-bottom: 20px;">🎉 Registration Confirmed!</h2>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
            Hi <strong>${studentName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
            You have successfully registered for the following event:
          </p>
          
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0;">${eventTitle}</h3>
            <p style="margin: 8px 0; color: #475569;"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 8px 0; color: #475569;"><strong>⏰ Time:</strong> ${eventTime}</p>
            <p style="margin: 8px 0; color: #475569;"><strong>📍 Venue:</strong> ${eventVenue}</p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            Please make sure to attend the event on time. Your attendance will be marked by the faculty.
          </p>
          
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 13px; color: #92400e;">
              <strong>⚠️ Important:</strong> Bring your student ID card to the event.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>College Event Management Team</strong>
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Registration email sent to ${studentEmail}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending registration email:', error.message);
    return { success: false, message: error.message };
  }
}

// Send attendance marked email
async function sendAttendanceEmail(studentEmail, studentName, eventTitle, attended) {
  if (!transporter) {
    console.log('⚠️  Email service not configured. Skipping email notification.');
    return { success: false, message: 'Email service not configured' };
  }

  const status = attended ? 'Present' : 'Absent';
  const statusColor = attended ? '#10b981' : '#ef4444';
  const statusIcon = attended ? '✅' : '❌';

  const mailOptions = {
    from: emailConfig.auth.user,
    to: studentEmail,
    subject: `${statusIcon} Attendance Marked - ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: ${statusColor}; margin-bottom: 20px;">${statusIcon} Attendance Update</h2>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
            Hi <strong>${studentName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
            Your attendance has been marked for:
          </p>
          
          <div style="background: #eff6ff; border-left: 4px solid ${statusColor}; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0;">${eventTitle}</h3>
            <p style="margin: 8px 0; color: #475569;">
              <strong>Status:</strong> 
              <span style="color: ${statusColor}; font-weight: 600;">${status}</span>
            </p>
          </div>
          
          ${attended ? `
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              Great job attending the event! Your score will be assigned by the faculty soon.
            </p>
          ` : `
            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
              You were marked absent for this event. Please ensure to attend future events.
            </p>
          `}
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>College Event Management Team</strong>
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Attendance email sent to ${studentEmail}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending attendance email:', error.message);
    return { success: false, message: error.message };
  }
}

// Send score assigned email
async function sendScoreEmail(studentEmail, studentName, eventTitle, score) {
  if (!transporter) {
    console.log('⚠️  Email service not configured. Skipping email notification.');
    return { success: false, message: 'Email service not configured' };
  }

  const mailOptions = {
    from: emailConfig.auth.user,
    to: studentEmail,
    subject: `🏆 Score Assigned - ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <h2 style="color: #f59e0b; margin-bottom: 20px;">🏆 Score Assigned!</h2>
          
          <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
            Hi <strong>${studentName}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 25px;">
            Your score has been assigned for:
          </p>
          
          <div style="background: #eff6ff; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0;">${eventTitle}</h3>
            <div style="text-align: center; margin: 20px 0;">
              <div style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; padding: 20px 40px; border-radius: 12px; font-size: 36px; font-weight: 700;">
                ${score} / 100
              </div>
            </div>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            ${score >= 80 ? 'Excellent performance! Keep up the great work! 🌟' : 
              score >= 60 ? 'Good job! Keep improving! 👍' : 
              'Keep working hard and you\'ll do better next time! 💪'}
          </p>
          
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>College Event Management Team</strong>
          </p>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
          This is an automated email. Please do not reply to this message.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Score email sent to ${studentEmail}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending score email:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  initializeEmailService,
  sendRegistrationEmail,
  sendAttendanceEmail,
  sendScoreEmail
};

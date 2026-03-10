import nodemailer from "nodemailer";
import OTP from "../models/otp.model.js";

let transporter;

function getTransporter() {
 if(transporter) return transporter;

  if(!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    throw new Error("GMAIL_USER and GMAIL_PASS environment")
}
 
    transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    })
    return transporter;
}


const sendOTPEmail = async (email) => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

      await OTP.findOneAndUpdate(
        { email },
        { otp, createdAt: new Date() },
        { upsert: true}
      );

      const mailTransporter = getTransporter();
      const html = `<h2>Your OTP Code</h2><p>Your OTP code is: <strong>${otp}</strong></p><p>This code will expire in 10 minutes.</p>`;
     const info =  await mailTransporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        html
      });
      console.log("OTP email sent: %s", info.messageId);
      return {success: true, message: "OTP sent to email"};
}

export { sendOTPEmail }

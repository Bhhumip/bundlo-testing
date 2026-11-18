import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import db from "../db.server";

const sesClient = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const FROM_ADDRESS = process.env.EMAIL_FROM;
const REPLY_TO = process.env.EMAIL_REPLY_TO;

async function sendEmail({ shop, event, to, subject, htmlBody }) {
    // Fall back to a safe address if we somehow don't have a real recipient
    const recipient = to || process.env.EMAIL_FALLBACK_RECIPIENT;

    const log = await db.emailLog.create({
        data: { shop, event, to: recipient, subject, status: "pending" },
    });

    try {
        const command = new SendEmailCommand({
            Source: FROM_ADDRESS,
            Destination: { ToAddresses: [recipient] },
            ReplyToAddresses: REPLY_TO ? [REPLY_TO] : undefined,
            Message: {
                Subject: { Data: subject },
                Body: { Html: { Data: htmlBody } },
            },
        });

        const result = await sesClient.send(command);

        await db.emailLog.update({
            where: { id: log.id },
            data: {
                status: "sent",
                messageId: result.MessageId,
            },
        });

        console.log(
            `[email] ${event} email sent to ${recipient} for ${shop}`
        );

        return true;
        
    } catch (error) {
        await db.emailLog.update({
            where: { id: log.id },
            data: {
                status: "failed",
                errorMessage: error.message,
            },
        });

        console.error(
            `[email] Failed to send ${event} email to ${recipient} for ${shop}:`,
            error.message
        );

        return false;
    }
}

export { sendEmail };
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/gmail.send",
];

function defaultReminders() {
  return {
    useDefault: false,
    overrides: [
      { method: "email", minutes: 3 * 24 * 60 },
      { method: "email", minutes: 24 * 60 },
      { method: "popup", minutes: 60 },
    ],
  };
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${(process.env.NEXTAUTH_URL ?? "").replace(/\/$/, "")}/api/auth/gcal/callback`
  );
}

export function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    login_hint: "reynaldi180101@gmail.com",
  });
}

function getAuthedClient() {
  const client = getOAuth2Client();
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  if (!refreshToken) return null;
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function createCalendarEvent(payload: {
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
}): Promise<string | null> {
  const auth = getAuthedClient();
  if (!auth) return null;
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: payload.summary,
      description: payload.description,
      start: { date: payload.startDate.slice(0, 10) },
      end: { date: payload.endDate.slice(0, 10) },
      reminders: defaultReminders(),
    },
  });
  return res.data.id ?? null;
}

export async function updateCalendarEvent(gcalEventId: string, payload: {
  summary: string;
  description: string;
  startDate: string;
  endDate: string;
}): Promise<void> {
  const auth = getAuthedClient();
  if (!auth) return;
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.patch({
    calendarId: "primary",
    eventId: gcalEventId,
    requestBody: {
      summary: payload.summary,
      description: payload.description,
      start: { date: payload.startDate.slice(0, 10) },
      end: { date: payload.endDate.slice(0, 10) },
      reminders: defaultReminders(),
    },
  });
}

export async function sendSubFaseEmail(payload: {
  to: string;
  picName: string;
  subFaseName: string;
  projectCode: string;
  projectName: string;
  fase: string;
  picStartDate: string | null;
  picTargetDate: string | null;
  customerTargetDate: string | null;
  documentUrl: string | null;
  description: string | null;
}): Promise<void> {
  const auth = getAuthedClient();
  if (!auth) return;
  const gmail = google.gmail({ version: "v1", auth });

  const startStr = payload.picStartDate ? new Date(payload.picStartDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-";
  const picTargetStr = payload.picTargetDate ? new Date(payload.picTargetDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-";
  const custTargetStr = payload.customerTargetDate ? new Date(payload.customerTargetDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#2563eb;padding:24px 28px">
      <h1 style="color:#fff;margin:0;font-size:18px">New SubPhase Assigned</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">${payload.projectCode} — ${payload.projectName}</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#374151">Hi <strong>${payload.picName}</strong>,</p>
      <p style="margin:0 0 20px;color:#374151">A new SubPhase has been assigned to you:</p>

      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px">SubPhase</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600">${payload.subFaseName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Phase</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${payload.fase}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">PIC Start Date</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${startStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">PIC Target Date</td>
            <td style="padding:6px 0;color:#dc2626;font-size:13px;font-weight:600">${picTargetStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Customer Deadline</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${custTargetStr}</td>
          </tr>
          ${payload.documentUrl ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Document</td>
            <td style="padding:6px 0;font-size:13px"><a href="${payload.documentUrl}" style="color:#2563eb">${payload.documentUrl}</a></td>
          </tr>` : ""}
        </table>
      </div>

      ${payload.description ? `<p style="color:#374151;font-size:13px;margin:0 0 20px"><strong>Notes:</strong> ${payload.description}</p>` : ""}

      <p style="color:#6b7280;font-size:12px;margin:0">This notification was sent by CMW Project Management System.</p>
    </div>
  </div>
</body>
</html>`;

  const subject = `[${payload.projectCode}] New SubPhase: ${payload.subFaseName}`;
  const raw = [
    `To: ${payload.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ].join("\r\n");

  const encoded = Buffer.from(raw).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
}

export async function sendReminderEmail(payload: {
  to: string;
  picName: string;
  subFaseName: string;
  projectCode: string;
  projectName: string;
  fase: string;
  picStartDate: string | null;
  picTargetDate: string | null;
  customerTargetDate: string | null;
  documentUrl: string | null;
  description: string | null;
  daysUntil: number;
}): Promise<void> {
  const auth = getAuthedClient();
  if (!auth) return;
  const gmail = google.gmail({ version: "v1", auth });

  const startStr = payload.picStartDate ? new Date(payload.picStartDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-";
  const picTargetStr = payload.picTargetDate ? new Date(payload.picTargetDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-";
  const custTargetStr = payload.customerTargetDate ? new Date(payload.customerTargetDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "-";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#d97706;padding:24px 28px">
      <h1 style="color:#fff;margin:0;font-size:18px">Deadline Reminder — H-${payload.daysUntil}</h1>
      <p style="color:#fef3c7;margin:6px 0 0;font-size:13px">${payload.projectCode} — ${payload.projectName}</p>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 16px;color:#374151">Hi <strong>${payload.picName}</strong>,</p>
      <p style="margin:0 0 20px;color:#374151">This is a reminder that your SubPhase deadline is in <strong>${payload.daysUntil} day(s)</strong>.</p>

      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin-bottom:20px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px">SubPhase</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600">${payload.subFaseName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Phase</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${payload.fase}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">PIC Start Date</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${startStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">PIC Target Date</td>
            <td style="padding:6px 0;color:#dc2626;font-size:13px;font-weight:600">${picTargetStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Customer Deadline</td>
            <td style="padding:6px 0;color:#111827;font-size:13px">${custTargetStr}</td>
          </tr>
          ${payload.documentUrl ? `
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px">Document</td>
            <td style="padding:6px 0;font-size:13px"><a href="${payload.documentUrl}" style="color:#2563eb">${payload.documentUrl}</a></td>
          </tr>` : ""}
        </table>
      </div>

      ${payload.description ? `<p style="color:#374151;font-size:13px;margin:0 0 20px"><strong>Notes:</strong> ${payload.description}</p>` : ""}

      <p style="color:#6b7280;font-size:12px;margin:0">This notification was sent by CMW Project Management System.</p>
    </div>
  </div>
</body>
</html>`;

  const subject = `[REMINDER H-${payload.daysUntil}] [${payload.projectCode}] ${payload.subFaseName}`;
  const raw = [
    `To: ${payload.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    html,
  ].join("\r\n");

  const encoded = Buffer.from(raw).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
}

export async function deleteCalendarEvent(gcalEventId: string): Promise<void> {
  const auth = getAuthedClient();
  if (!auth) return;
  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({ calendarId: "primary", eventId: gcalEventId });
  } catch {
    // Ignore if already deleted
  }
}

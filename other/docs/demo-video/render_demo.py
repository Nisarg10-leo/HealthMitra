#!/usr/bin/env python3
"""Render a silent 2:56 HealthMitra product walkthrough from the approved UI captures."""

from pathlib import Path
import math
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parents[3]
UI = ROOT / "other/docs/design/ui"
OUT = ROOT / "other/docs/demo-video/HealthMitra-demo.mp4"
W, H, FPS = 1920, 1080, 15
PANEL = (70, 260, 1270, 800)
INFO = (1380, 260, 470, 800)
FPS_FRAMES = lambda seconds: round(seconds * FPS)

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
FONT_REG = FONT_DIR / "Arial.ttf"
FONT_BOLD = FONT_DIR / "Arial Bold.ttf"

PALETTE = {
    "forest": (19, 52, 45),
    "forest2": (25, 65, 56),
    "cream": (248, 246, 238),
    "paper": (255, 255, 252),
    "ink": (28, 51, 54),
    "muted": (98, 120, 122),
    "leaf": (63, 150, 113),
    "blue": (80, 101, 215),
    "gold": (243, 194, 91),
    "line": (224, 231, 225),
    "red": (190, 64, 68),
}


def font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REG
    return ImageFont.truetype(str(path), size)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def wrap_lines(draw, text, selected_font, max_width):
    words = text.split()
    lines = []
    line = ""
    for word in words:
        candidate = word if not line else f"{line} {word}"
        if draw.textlength(candidate, font=selected_font) <= max_width or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_wrapped(draw, xy, text, selected_font, fill, max_width, line_gap=8, max_lines=None):
    x, y = xy
    lines = wrap_lines(draw, text, selected_font, max_width)
    if max_lines:
        lines = lines[:max_lines]
    line_h = selected_font.getbbox("Ag")[3] - selected_font.getbbox("Ag")[1]
    for line in lines:
        draw.text((x, y), line, font=selected_font, fill=fill)
        y += line_h + line_gap
    return y


def draw_pill(draw, box, label, fill, text_fill, selected_font=None, outline=None):
    selected_font = selected_font or font(18, True)
    draw.rounded_rectangle(box, radius=(box[3] - box[1]) // 2, fill=fill, outline=outline, width=2 if outline else 1)
    bbox = draw.textbbox((0, 0), label, font=selected_font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = box[0] + (box[2] - box[0] - tw) // 2
    y = box[1] + (box[3] - box[1] - th) // 2 - bbox[1]
    draw.text((x, y), label, font=selected_font, fill=text_fill)


def draw_app_chrome(image, active="Today"):
    d = ImageDraw.Draw(image)
    d.rectangle((0, 0, image.width, image.height), fill=(249, 249, 245))
    d.rectangle((0, 0, 205, image.height), fill=(255, 255, 253))
    d.line((204, 0, 204, image.height), fill=(228, 233, 228), width=2)
    d.rounded_rectangle((28, 27, 57, 56), radius=7, fill=PALETTE["blue"])
    d.rectangle((40, 31, 46, 52), fill=(255, 255, 255))
    d.rectangle((32, 38, 54, 45), fill=(255, 255, 255))
    d.text((69, 28), "HealthMitra", font=font(25, True), fill=PALETTE["ink"])
    d.text((29, 88), "PATIENT MODE", font=font(14, True), fill=PALETTE["muted"])
    navs = ["Today", "Medicines", "Caregiver", "Alerts", "Symptoms", "Contacts", "Profile"]
    y = 137
    for name in navs:
        if name == active:
            d.rounded_rectangle((16, y - 9, 188, y + 44), radius=13, fill=(236, 239, 255))
        d.ellipse((31, y + 8, 45, y + 22), fill=PALETTE["blue"] if name == active else (133, 151, 151))
        d.text((57, y), name, font=font(18, name == active), fill=PALETTE["blue"] if name == active else PALETTE["ink"])
        y += 61
    d.text((238, 28), "Meera Shah", font=font(17, True), fill=PALETTE["muted"])
    draw_pill(d, (1092, 21, 1181, 61), "EN / HI", (255, 255, 255), PALETTE["ink"], font(14, True), PALETTE["line"])
    draw_pill(d, (1193, 21, 1250, 61), "SOS", (255, 244, 243), PALETTE["red"], font(14, True), (241, 208, 205))


def draw_custom_screen(kind):
    """Create a clean in-product style visual for screens without a stored capture."""
    im = Image.new("RGB", (PANEL[2], PANEL[3]), PALETTE["cream"])
    d = ImageDraw.Draw(im)

    def card(box, title, sub=None, accent=None):
        d.rounded_rectangle(box, radius=19, fill=(255, 255, 253), outline=PALETTE["line"], width=2)
        if accent:
            d.rounded_rectangle((box[0] + 19, box[1] + 19, box[0] + 28, box[3] - 19), radius=5, fill=accent)
        tx = box[0] + (48 if accent else 22)
        d.text((tx, box[1] + 20), title, font=font(23, True), fill=PALETTE["ink"])
        if sub:
            draw_wrapped(d, (tx, box[1] + 58), sub, font(17), PALETTE["muted"], box[2] - tx - 20, 5, 2)

    if kind == "medications":
        draw_app_chrome(im, "Medicines")
        d.text((238, 92), "Your medicine plan", font=font(34, True), fill=PALETTE["ink"])
        d.text((238, 137), "Add prescriptions and set a routine that fits your day.", font=font(19), fill=PALETTE["muted"])
        draw_pill(d, (1030, 91, 1247, 139), "+  Add medicine", PALETTE["blue"], (255, 255, 255), font(17, True))
        card((237, 195, 1245, 277), "Metformin", "500 mg   ·   08:00 and 20:00   ·   Daily", PALETTE["blue"])
        card((237, 293, 1245, 375), "Amlodipine", "5 mg   ·   09:00   ·   Daily", (231, 123, 71))
        card((237, 391, 1245, 473), "Vitamin D3", "1000 IU   ·   13:00   ·   Daily", (42, 157, 143))
        # A restrained form inset demonstrates the fields in the real medicine editor.
        d.rounded_rectangle((480, 500, 1188, 776), radius=22, fill=(255, 255, 255), outline=(216, 223, 219), width=2)
        d.text((511, 520), "Add a medicine", font=font(26, True), fill=PALETTE["ink"])
        draw_pill(d, (923, 518, 1154, 557), "Scan prescription", (242, 247, 246), PALETTE["leaf"], font(15, True), (213, 230, 220))
        for label, value, y, width in [
            ("MEDICINE NAME", "Metformin", 577, 617),
            ("DOSAGE", "500 mg", 636, 617),
            ("TIMES • 24-HOUR", "08:00, 20:00", 695, 617),
        ]:
            d.text((511, y), label, font=font(12, True), fill=PALETTE["muted"])
            d.rounded_rectangle((511, y + 19, 511 + width, y + 57), radius=9, fill=(250, 251, 249), outline=PALETTE["line"], width=2)
            d.text((528, y + 26), value, font=font(17), fill=PALETTE["ink"])
        draw_pill(d, (1059, 716, 1154, 755), "Save", PALETTE["blue"], (255, 255, 255), font(15, True))

    elif kind == "contacts":
        draw_app_chrome(im, "Contacts")
        d.text((238, 92), "Helpful contacts", font=font(34, True), fill=PALETTE["ink"])
        d.text((238, 137), "Keep your care team close when you need them.", font=font(19), fill=PALETTE["muted"])
        draw_pill(d, (1015, 91, 1247, 139), "+  Add contact", PALETTE["blue"], (255, 255, 255), font(17, True))
        d.text((238, 210), "DOCTORS", font=font(14, True), fill=PALETTE["blue"])
        card((237, 241, 1245, 372), "Dr. R. Nair", "General Physician   ·   Clinic hours 10 AM–1 PM", (80, 101, 215))
        draw_pill(d, (934, 319, 1209, 357), "+91 98123 45678   ↗", (237, 241, 255), PALETTE["blue"], font(16, True))
        d.text((238, 419), "PHARMACY", font=font(14, True), fill=PALETTE["leaf"])
        card((237, 449, 1245, 580), "CarePlus Pharmacy", "14, Lake Road, Mumbai", (42, 157, 143))
        draw_pill(d, (934, 527, 1209, 565), "+91 98987 65432   ↗", (231, 247, 239), PALETTE["leaf"], font(16, True))
        d.rounded_rectangle((237, 624, 1245, 765), radius=19, fill=(239, 246, 240))
        d.text((267, 649), "A simple directory for everyday care", font=font(21, True), fill=(52, 111, 84))
        draw_wrapped(d, (267, 687), "Save and update doctor or pharmacy details. Phone links open directly from the contact card.", font(17), (84, 117, 101), 880, 6, 2)

    elif kind == "checkup":
        draw_app_chrome(im, "Caregiver")
        d.text((238, 92), "Daily wellness check-in", font=font(34, True), fill=PALETTE["ink"])
        d.text((238, 137), "A small update helps family stay informed.", font=font(19), fill=PALETTE["muted"])
        draw_pill(d, (991, 91, 1247, 139), "Request an update", PALETTE["blue"], (255, 255, 255), font(16, True))
        # Compact health cards
        stats = [("BLOOD PRESSURE", "122 / 82", "mmHg", PALETTE["blue"]), ("BLOOD SUGAR", "108", "mg/dL", PALETTE["leaf"]), ("SLEEP", "Good", "last night", (231, 123, 71))]
        x = 237
        for label, value, unit, accent in stats:
            d.rounded_rectangle((x, 202, x + 316, 327), radius=17, fill=(255, 255, 253), outline=PALETTE["line"], width=2)
            d.text((x + 21, 220), label, font=font(13, True), fill=PALETTE["muted"])
            d.text((x + 21, 252), value, font=font(29, True), fill=accent)
            d.text((x + 21, 294), unit, font=font(15), fill=PALETTE["muted"])
            x += 336
        d.rounded_rectangle((237, 359, 1245, 744), radius=20, fill=(255, 255, 253), outline=PALETTE["line"], width=2)
        d.text((269, 386), "Today's check-in", font=font(24, True), fill=PALETTE["ink"])
        draw_pill(d, (1049, 382, 1208, 423), "Submitted", (231, 247, 239), PALETTE["leaf"], font(15, True))
        fields = [("Mood", "Feeling great"), ("Blood pressure", "122 / 82"), ("Blood sugar", "108 mg/dL"), ("Notes", "Morning medicine taken with breakfast")]
        y = 446
        for label, value in fields:
            d.text((269, y), label.upper(), font=font(12, True), fill=PALETTE["muted"])
            d.text((489, y - 3), value, font=font(18, True), fill=PALETTE["ink"])
            d.line((269, y + 32, 1207, y + 32), fill=(235, 238, 234), width=2)
            y += 67
        d.text((269, 718), "Caregivers can request a check-in and review recent updates.", font=font(16), fill=PALETTE["muted"])

    elif kind == "profile":
        draw_app_chrome(im, "Profile")
        d.text((238, 92), "Your health profile", font=font(34, True), fill=PALETTE["ink"])
        d.text((238, 137), "Personal details and useful preferences, in one place.", font=font(19), fill=PALETTE["muted"])
        d.rounded_rectangle((237, 203, 1245, 383), radius=20, fill=(255, 255, 253), outline=PALETTE["line"], width=2)
        d.ellipse((266, 234, 355, 323), fill=(232, 212, 184))
        d.text((291, 249), "M", font=font(44, True), fill=PALETTE["ink"])
        d.text((382, 237), "Meera Shah", font=font(25, True), fill=PALETTE["ink"])
        d.text((382, 276), "Patient  ·  O+  ·  Vegetarian", font=font(17), fill=PALETTE["muted"])
        d.text((382, 316), "Emergency contact  Arjun Shah  ·  Son", font=font(17), fill=PALETTE["muted"])
        draw_pill(d, (1020, 315, 1207, 355), "Edit profile", (237, 241, 255), PALETTE["blue"], font(15, True))
        d.rounded_rectangle((237, 412, 1245, 752), radius=20, fill=(255, 255, 253), outline=PALETTE["line"], width=2)
        d.text((269, 439), "Preferences", font=font(24, True), fill=PALETTE["ink"])
        d.text((269, 495), "LANGUAGE", font=font(12, True), fill=PALETTE["muted"])
        draw_pill(d, (269, 519, 544, 564), "English     Hindi", (237, 241, 255), PALETTE["blue"], font(16, True))
        d.text((269, 598), "MEDICINE ALARM", font=font(12, True), fill=PALETTE["muted"])
        d.text((269, 624), "Choose a tone and preview it before saving.", font=font(17), fill=PALETTE["ink"])
        for i, label in enumerate(["Gentle chime", "Classic bell", "Soft pulse"]):
            draw_pill(d, (269 + i * 237, 679, 483 + i * 237, 722), label, (245, 247, 244) if i else (231, 247, 239), PALETTE["leaf"] if i == 0 else PALETTE["ink"], font(14, True), (218, 231, 220))

    return im


def load_screenshot(filename):
    return Image.open(UI / filename).convert("RGB")


SCENES = [
    {
        "duration": 10, "eyebrow": "HEALTHMITRA  ·  A CONNECTED CARE COMPANION", "title": "Care, close to home.",
        "deck": "One simple routine. A clearer picture for the people who care.", "screen": "01-sign-in.png", "screen_label": "WELCOME / ROLE-AWARE SIGN IN",
        "card_title": "Care starts with a simple choice", "points": [
            ("Patient mode", "Clear daily routines and easy confirmations."),
            ("Caregiver mode", "Useful updates without constant check-in calls."),
            ("One connected loop", "Care stays personal, private, and close.")]
    },
    {
        "duration": 15, "eyebrow": "01  /  THE DAILY ROUTINE", "title": "Everything for today, at a glance.",
        "deck": "The next step is easy to spot and easy to act on.", "screen": "02-patient-today.png", "screen_label": "PATIENT VIEW / TODAY'S MEDICINES",
        "card_title": "A calmer way to stay on track", "points": [
            ("Today's schedule", "See each medicine, its dose, and the time."),
            ("Clear progress", "Taken, pending, and missed states stay visible."),
            ("Simple actions", "Confirm a dose directly from the daily plan.")]
    },
    {
        "duration": 15, "eyebrow": "02  /  REMINDERS THAT CLOSE THE LOOP", "title": "A reminder becomes a recorded dose.",
        "deck": "Audible alerts meet a one-tap or voice-friendly response.", "screen": "02-patient-today.png", "screen_label": "DOSE ALERT / TAP OR SPEAK",
        "card_title": "A helpful nudge, then a clear outcome", "points": [
            ("Personal alarm", "Choose a tone and preview it in settings."),
            ("Respond your way", "Mark taken or skipped, or answer by voice."),
            ("Snooze when needed", "Dismiss, snooze, and return to the routine.")]
    },
    {
        "duration": 15, "eyebrow": "03  /  MEDICINE MANAGEMENT", "title": "Shape the schedule around real life.",
        "deck": "Build or update a medicine plan with multiple daily times.", "screen": "custom:medications", "screen_label": "MEDICINE LIST / PRESCRIPTION FORM",
        "card_title": "Set up each prescription", "points": [
            ("Add, edit, or remove", "Keep dosage and instructions up to date."),
            ("Flexible timing", "Set multiple times and treatment dates."),
            ("Scan to get started", "Prescription images can be scanned for details.")]
    },
    {
        "duration": 15, "eyebrow": "04  /  CAREGIVER DASHBOARD", "title": "Family can see how the week is going.",
        "deck": "A clear view of adherence, streaks, and the current schedule.", "screen": "05-caregiver-dashboard.png", "screen_label": "CAREGIVER VIEW / WEEKLY ADHERENCE",
        "card_title": "Confidence without hovering", "points": [
            ("At-a-glance status", "Review today's adherence and open alerts."),
            ("Weekly picture", "See progress, history, and consistency trends."),
            ("Switch patients", "Follow the people linked to your account.")]
    },
    {
        "duration": 15, "eyebrow": "05  /  HISTORY AND ALERTS", "title": "When a dose is missed, the loop stays open.",
        "deck": "Dose history shows what happened and alerts bring the right person in.", "screen": "06-caregiver-alerts.png", "screen_label": "CARE UPDATES / MISSED DOSE ALERTS",
        "card_title": "The right context reaches family", "points": [
            ("Dose history", "Review taken, skipped, and missed responses."),
            ("Automatic follow-up", "Unconfirmed doses become caregiver alerts."),
            ("Acknowledge and act", "Mark updates read or escalate through WhatsApp.")]
    },
    {
        "duration": 15, "eyebrow": "06  /  EMERGENCY SUPPORT", "title": "Help is never far from the home screen.",
        "deck": "A clear SOS action can notify connected caregivers in a moment.", "screen": "03-patient-sos.png", "screen_label": "PATIENT VIEW / EMERGENCY SOS",
        "card_title": "A fast path to family support", "points": [
            ("Send an SOS", "Trigger a request for connected caregivers and family."),
            ("Location and fall support", "Share location when available; impact alerts include a 30-second cancel window."),
            ("Follow through", "Acknowledge or resolve, open a map, or use WhatsApp and helpline links.")]
    },
    {
        "duration": 13, "eyebrow": "07  /  EVERYDAY WELLNESS", "title": "Small check-ins add helpful context.",
        "deck": "Caregivers can request a daily update and review recent wellness notes.", "screen": "custom:checkup", "screen_label": "WELLNESS / DAILY CHECK-IN",
        "card_title": "Beyond the medicine schedule", "points": [
            ("Log a check-in", "Capture mood, sleep, vitals, and notes."),
            ("Request an update", "A caregiver can send a gentle prompt."),
            ("Keep context together", "Recent entries help family stay informed.")]
    },
    {
        "duration": 15, "eyebrow": "08  /  SYMPTOM SUPPORT", "title": "Gentle guidance for common symptoms.",
        "deck": "A few taps or a spoken symptom lead to clear, cautious suggestions.", "screen": "04-patient-symptoms.png", "screen_label": "PATIENT VIEW / SYMPTOM CHECKER",
        "card_title": "Helpful guidance, with limits made clear", "points": [
            ("Choose or say", "Use common symptom choices or voice input."),
            ("Get a next step", "See simple self-care guidance for minor issues."),
            ("Safety stays visible", "The app never presents this as a diagnosis.")]
    },
    {
        "duration": 12, "eyebrow": "09  /  YOUR CARE TEAM", "title": "Keep trusted contacts one tap away.",
        "deck": "A simple directory brings doctors and pharmacies together.", "screen": "custom:contacts", "screen_label": "CONTACTS / DOCTORS AND PHARMACIES",
        "card_title": "Practical contacts, ready when needed", "points": [
            ("Doctor directory", "Save specialty and phone details."),
            ("Pharmacy details", "Keep the address close at hand."),
            ("Tap to call", "Phone links work directly from each card.")]
    },
    {
        "duration": 14, "eyebrow": "10  /  A SHARED CARE CIRCLE", "title": "Support stays permission-aware.",
        "deck": "Patients and caregivers connect, switch patients, and share the right access.", "screen": "07-mobile-caregiver.png", "screen_label": "MOBILE VIEW / LINKED CAREGIVER",
        "card_title": "A family connection with boundaries", "points": [
            ("Join with a code", "Connect a caregiver to the patient profile."),
            ("Set access", "Choose view-only or schedule-editing access."),
            ("Stay in sync", "Patients and caregivers see one shared routine.")]
    },
    {
        "duration": 12, "eyebrow": "11  /  PERSONAL SETTINGS", "title": "Make the experience feel familiar.",
        "deck": "Language, health details, emergency contacts, and alarm preferences live in profile.", "screen": "custom:profile", "screen_label": "PROFILE / LANGUAGE AND ALARM SETTINGS",
        "card_title": "Designed around the person", "points": [
            ("English and Hindi", "Switch the interface and voice prompts."),
            ("Health profile", "Keep personal and emergency details together."),
            ("Alarm preferences", "Select and preview a sound that feels right.")]
    },
    {
        "duration": 10, "eyebrow": "12  /  HEALTHMITRA", "title": "Care, connected.",
        "deck": "More independence for patients. More confidence for the people who love them.", "screen": "closing", "screen_label": "PATIENT AND CAREGIVER / DESKTOP AND MOBILE",
        "card_title": "One routine. A family in the loop.", "points": [
            ("Patient-first", "Clear, comfortable everyday interactions."),
            ("Family-aware", "Timely updates when support is needed."),
            ("HealthMitra", "Simple medicine care, close to home.")]
    },
]


def draw_background():
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    base0 = np.array(PALETTE["forest"], dtype=np.float32)
    base1 = np.array(PALETTE["forest2"], dtype=np.float32)
    blend = np.clip(0.12 + 0.30 * x + 0.12 * y, 0, 0.5)[..., None]
    arr = base0[None, None, :] * (1 - blend) + base1[None, None, :] * blend
    # Add very soft, low-contrast light pools for depth.
    gx = ((x - 0.80) ** 2 / 0.10 + (y - 0.18) ** 2 / 0.15)
    glow = np.exp(-gx * 3.0)[..., None] * 8
    arr += glow * np.array([0.55, 0.70, 0.50], dtype=np.float32)[None, None, :]
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    image = Image.fromarray(arr, "RGB")
    d = ImageDraw.Draw(image, "RGBA")
    d.ellipse((1320, -340, 2180, 520), outline=(255, 255, 255, 15), width=2)
    d.ellipse((1435, -220, 2070, 390), outline=(243, 194, 91, 12), width=2)
    d.arc((-240, 670, 330, 1220), start=205, end=350, fill=(255, 255, 255, 13), width=2)
    for x0 in range(36, W, 74):
        for y0 in range(30, H, 74):
            if (x0 * 3 + y0) % 5 == 0:
                d.ellipse((x0, y0, x0 + 2, y0 + 2), fill=(255, 255, 255, 12))
    return image


def build_screen(scene):
    kind = scene["screen"]
    if kind == "closing":
        return None
    if kind.startswith("custom:"):
        return draw_custom_screen(kind.split(":", 1)[1])
    return load_screenshot(kind)


def draw_main_panel(base, scene, elapsed, scene_index):
    x, y, pw, ph = PANEL
    d = ImageDraw.Draw(base)
    # Soft shadow and clean paper frame.
    d.rounded_rectangle((x - 4, y + 10, x + pw + 5, y + ph + 12), radius=28, fill=(8, 30, 25))
    d.rounded_rectangle((x - 8, y - 8, x + pw + 8, y + ph + 8), radius=27, fill=(255, 255, 255))

    if scene["screen"] == "closing":
        # Desktop dashboard and mobile view share the same frame.
        desk = load_screenshot("05-caregiver-dashboard.png")
        mobile = load_screenshot("07-mobile-caregiver.png")
        d.rounded_rectangle((x, y, x + 854, y + ph), radius=21, fill=(239, 241, 236))
        # fit and clip the dashboard screenshot
        dw, dh = 848, 534
        desk_fit = desk.resize((dw, dh), Image.Resampling.LANCZOS)
        desk_mask = rounded_mask((dw, dh), 14)
        base.paste(desk_fit, (x + 3, y + 110), desk_mask)
        d.rounded_rectangle((x + 884, y + 35, x + 1240, y + 765), radius=34, fill=(31, 45, 43))
        mw, mh = 326, 706
        mfit = mobile.resize((mw, mh), Image.Resampling.LANCZOS)
        mmask = rounded_mask((mw, mh), 24)
        base.paste(mfit, (x + 899, y + 47), mmask)
        d.text((x + 36, y + 44), "One shared care circle", font=font(24, True), fill=PALETTE["ink"])
        d.text((x + 36, y + 665), "Desktop for the caregiver  ·  mobile for family on the move", font=font(16), fill=PALETTE["muted"])
    elif scene["screen"] == "07-mobile-caregiver.png":
        # Pair the real mobile history capture with the caregiver overview to
        # show that the same care circle works across screen sizes.
        d.rounded_rectangle((x, y, x + pw, y + ph), radius=20, fill=(241, 243, 236))
        mobile = load_screenshot("07-mobile-caregiver.png")
        desk = load_screenshot("05-caregiver-dashboard.png")
        d.rounded_rectangle((x + 49, y + 22, x + 424, y + 778), radius=34, fill=(31, 45, 43))
        mw, mh = 347, 736
        mfit = mobile.resize((mw, mh), Image.Resampling.LANCZOS)
        mmask = rounded_mask((mw, mh), 24)
        base.paste(mfit, (x + 63, y + 32), mmask)
        d.text((x + 472, y + 58), "One family. A shared view.", font=font(25, True), fill=PALETTE["ink"])
        d.text((x + 472, y + 99), "Caregiver dashboard", font=font(16, True), fill=PALETTE["blue"])
        dw, dh = 735, 463
        dfit = desk.resize((dw, dh), Image.Resampling.LANCZOS)
        dmask = rounded_mask((dw, dh), 15)
        base.paste(dfit, (x + 472, y + 137), dmask)
        d.rounded_rectangle((x + 472, y + 632, x + 1208, y + 750), radius=17, fill=(255, 255, 253), outline=PALETTE["line"], width=2)
        d.text((x + 499, y + 652), "Linked patient", font=font(13, True), fill=PALETTE["muted"])
        d.text((x + 499, y + 680), "Meera Shah   ·   Medication history   ·   Alerts", font=font(18, True), fill=PALETTE["ink"])
        d.text((x + 499, y + 716), "Permission-aware sharing keeps control with the patient.", font=font(14), fill=PALETTE["muted"])
    else:
        screen = build_screen(scene)
        # Gentle Ken Burns zoom, with a small lateral drift across each segment.
        t = max(0.0, min(1.0, elapsed / scene["duration"]))
        zoom = 1.012 + 0.024 * (0.5 - 0.5 * math.cos(math.pi * t))
        sw, sh = max(pw, int(pw * zoom)), max(ph, int(ph * zoom))
        resized = screen.resize((sw, sh), Image.Resampling.LANCZOS)
        drift = int((t - 0.5) * min(30, sw - pw))
        left = max(0, min(sw - pw, (sw - pw) // 2 + drift))
        top = max(0, min(sh - ph, (sh - ph) // 2))
        panel = resized.crop((left, top, left + pw, top + ph))
        mask = rounded_mask((pw, ph), 20)
        base.paste(panel, (x, y), mask)

    # Screen label, small and understated.
    pill_box = (x + 20, y + 17, x + 20 + int(ImageDraw.Draw(base).textlength(scene["screen_label"], font=font(12, True))) + 30, y + 48)
    d.rounded_rectangle(pill_box, radius=15, fill=(19, 52, 45))
    d.text((pill_box[0] + 14, pill_box[1] + 8), scene["screen_label"], font=font(12, True), fill=(255, 255, 255))


def make_static_base(scene, index):
    base = draw_background().convert("RGBA")
    d = ImageDraw.Draw(base, "RGBA")
    # Header / brand mark.
    d.rounded_rectangle((70, 40, 112, 82), radius=12, fill=(*PALETTE["gold"], 255))
    d.rectangle((87, 47, 95, 75), fill=(*PALETTE["forest"], 255))
    d.rectangle((77, 57, 105, 65), fill=(*PALETTE["forest"], 255))
    d.text((128, 43), "HEALTHMITRA", font=font(19, True), fill=(249, 248, 239, 255))
    d.text((128, 67), "CONNECTED CARE, MADE SIMPLE", font=font(10, True), fill=(191, 211, 200, 255))
    d.text((1530, 52), "PRODUCT WALKTHROUGH", font=font(13, True), fill=(215, 229, 216, 255))
    d.rounded_rectangle((1771, 38, 1850, 81), radius=20, fill=(43, 83, 71, 255), outline=(86, 124, 105, 255), width=1)
    d.text((1790, 50), "2:56", font=font(15, True), fill=(249, 248, 239, 255))

    # Section heading.
    d.text((75, 119), scene["eyebrow"], font=font(15, True), fill=(*PALETTE["gold"], 255))
    title_font = font(42, True)
    draw_wrapped(d, (75, 149), scene["title"], title_font, (255, 255, 251, 255), 1760, 2, 1)
    d.text((77, 207), scene["deck"], font=font(19), fill=(205, 221, 211, 255))

    # Information panel.
    ix, iy, iw, ih = INFO
    d.rounded_rectangle((ix + 3, iy + 10, ix + iw + 3, iy + ih + 10), radius=27, fill=(4, 26, 22, 98))
    d.rounded_rectangle((ix, iy, ix + iw, iy + ih), radius=27, fill=(*PALETTE["cream"], 255))
    d.text((ix + 34, iy + 30), f"FEATURE TOUR     {index + 1:02d} / {len(SCENES):02d}", font=font(12, True), fill=(*PALETTE["blue"], 255))
    draw_wrapped(d, (ix + 34, iy + 67), scene["card_title"], font(29, True), (*PALETTE["ink"], 255), iw - 68, 5, 2)
    d.line((ix + 34, iy + 150, ix + iw - 34, iy + 150), fill=(*PALETTE["line"], 255), width=2)

    y = iy + 177
    for point_idx, (head, detail) in enumerate(scene["points"]):
        d.ellipse((ix + 34, y + 2, ix + 66, y + 34), fill=(*PALETTE["blue"], 255))
        number = str(point_idx + 1)
        tw = d.textlength(number, font=font(14, True))
        d.text((ix + 50 - tw / 2, y + 8), number, font=font(14, True), fill=(255, 255, 255, 255))
        d.text((ix + 81, y), head, font=font(19, True), fill=(*PALETTE["ink"], 255))
        end_y = draw_wrapped(d, (ix + 81, y + 31), detail, font(16), (*PALETTE["muted"], 255), iw - 119, 5, 3)
        y = max(y + 116, end_y + 27)
        if point_idx < 2:
            d.line((ix + 81, y - 9, ix + iw - 34, y - 9), fill=(*PALETTE["line"], 255), width=1)

    # The quiet prototype note is useful in a classroom demo.
    d.rounded_rectangle((ix + 31, iy + ih - 62, ix + iw - 31, iy + ih - 27), radius=17, fill=(235, 241, 233, 255))
    note = "ACADEMIC PROTOTYPE  ·  DEMO DATA"
    tw = d.textlength(note, font=font(11, True))
    d.text((ix + (iw - tw) / 2, iy + ih - 52), note, font=font(11, True), fill=(95, 125, 107, 255))

    # Screen panel is painted after the header to sit naturally below it.
    draw_main_panel(base, scene, elapsed=0, scene_index=index)
    base = base.convert("RGB")
    return base


def render_frame(base, scene, elapsed, index):
    # Keep the text and chrome stable while the captured app screen drifts subtly.
    frame = base.copy()
    draw_main_panel(frame, scene, elapsed, index)
    d = ImageDraw.Draw(frame)
    # Progress bar across the lower edge.
    total = sum(s["duration"] for s in SCENES)
    start = sum(s["duration"] for s in SCENES[:index])
    position = (start + elapsed) / total
    d.rounded_rectangle((70, 1071, 1850, 1077), radius=3, fill=(74, 107, 94))
    d.rounded_rectangle((70, 1071, 70 + int(1780 * position), 1077), radius=3, fill=PALETTE["gold"])
    return frame


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    # Prepare slide backplates once; screenshots are animated separately per frame.
    bases = [make_static_base(scene, i) for i, scene in enumerate(SCENES)]
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(OUT), fourcc, FPS, (W, H))
    if not writer.isOpened():
        raise RuntimeError("Could not open an MP4 video writer")

    previous = None
    total_frames = 0
    dissolve_frames = FPS_FRAMES(0.65)
    for idx, (scene, base) in enumerate(zip(SCENES, bases)):
        count = FPS_FRAMES(scene["duration"])
        print(f"Rendering {idx + 1:02d}/{len(SCENES):02d}: {scene['title']}", flush=True)
        for frame_idx in range(count):
            elapsed = frame_idx / FPS
            current = render_frame(base, scene, elapsed, idx)
            if previous is None:
                alpha = min(1.0, frame_idx / max(1, FPS_FRAMES(0.9)))
                if alpha < 1:
                    dark = Image.new("RGB", (W, H), PALETTE["forest"])
                    current = Image.blend(dark, current, alpha)
            elif frame_idx < dissolve_frames:
                current = Image.blend(previous, current, (frame_idx + 1) / dissolve_frames)
            writer.write(cv2.cvtColor(np.asarray(current), cv2.COLOR_RGB2BGR))
            total_frames += 1
        previous = render_frame(base, scene, scene["duration"], idx)
    writer.release()

    duration = total_frames / FPS
    size_mb = OUT.stat().st_size / (1024 * 1024)
    print(f"Finished: {OUT}")
    print(f"Duration: {int(duration // 60)}:{int(duration % 60):02d} ({duration:.2f} seconds)")
    print(f"Frames: {total_frames} at {FPS} fps")
    print(f"File size: {size_mb:.1f} MB")


if __name__ == "__main__":
    main()

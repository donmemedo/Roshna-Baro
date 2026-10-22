# UI/UX report (apple-design)

Screenshots: `docs/screenshots/` (light and dark, Persian and English, phone and desktop). Automated browser run: 43 pages, 0 console errors, 0 CSP violations, 0 horizontal overflow (`evidence/visual-check-report.json`).

## Principles applied

| apple-design principle | Change |
|---|---|
| Response and feedback on press | Existing press-down feedback kept; saves, errors and loading now give immediate visible and announced feedback |
| Springs and interruptibility | One critically damped spring (bounce 0, 0.4 s) for everything touchable; sheets use a small bounce (0.15, 0.35 s) |
| Momentum projection | The "More" sheet and article sheet dismiss by where a flick would land, with rubber-band resistance at the edge |
| Spatial consistency | Sheets enter from the bottom and leave to the bottom |
| Materials | Lighter blur on small screens; solid surfaces when the user asks for reduced transparency |
| Reduced motion, transparency, contrast | All three handled: cross-fades instead of slides, solid surfaces, stronger borders |
| Eased theme change | 0.4 s colour transition on light/dark switch, skipped for reduced motion |
| Typography | Body tracking 0, headings tight, Persian line height 1.8 and Latin 1.55, optical sizing, self-hosted Vazirmatn and Inter |
| Wayfinding | Labelled mobile tab bar with four destinations plus More; skip link; current page marked for screen readers |
| Agency and forgiveness | Inline "Delete?" confirmation for cycles; account deletion asks for the password |
| Responsibility | Medical disclaimer under predictions; no claims the product cannot support; export and delete in Settings |
| Craft | Skeleton placeholders instead of spinners; error states with retry; consistent copy in both languages |

## Persian UX vocabulary (from your reference)

«ایمیل» replaces «رایانامه»; «نادرست» (not «اشتباه») for wrong input; «حذف» used consistently for delete; «انصراف» for cancel in confirmations; «دریافت» for download; «حساب کاربری» for account; «پیش‌خوان» kept for the dashboard; error messages are one language per locale instead of a mixed "fa / en" string.

## Known gaps

No Jalali date picker (date inputs use the browser's Gregorian picker, though dates are displayed in Jalali); no month navigation in the calendar; dialogs lack a full focus trap; contrast of mint text on the light theme is about 2.4:1 by the QA reviewer's estimate and should be checked with a contrast tool; no screen-reader pass was performed.

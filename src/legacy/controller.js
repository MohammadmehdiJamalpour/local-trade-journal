import { services } from "../services";
import { parseCSV, csvEscape, csvUnescape } from "../portability/csv";
export const ready = (async () => {
  "use strict";

  const demoParameter = new URLSearchParams(location.search).get("demo");
  const IS_DEMO =
    demoParameter === "1" ||
    (demoParameter !== "0" &&
      document.documentElement.dataset.demoDefault === "true");
  const STORAGE_KEY = IS_DEMO ? "edge-journal:demo:v4:100" : "edge-journal:v3";
  const LEGACY_STORAGE_KEYS = IS_DEMO
    ? []
    : ["edge-journal:v2", "edge-journal:v1"];
  const VERSION = 13; // Keep the storage key so existing journals migrate in place.
  const DEFAULT_CONFIRMATIONS = [
    "هم‌جهتی روند تایم بالاتر",
    "شکست ساختار (BOS)",
    "تغییر ساختار (CHOCH/MSS)",
    "حمایت / مقاومت",
    "عرضه / تقاضا",
    "جمع‌آوری نقدینگی",
    "اردربلاک",
    "FVG / عدم‌تعادل",
    "پولبک / ریتست",
    "الگوی کندلی",
    "حجم",
    "واگرایی",
    "میانگین متحرک / VWAP",
    "فیبوناچی",
    "خبر / فاندامنتال",
  ];
  const LABELS = {
    status: {
      planned: "برنامه‌ریزی‌شده",
      open: "باز",
      closed: "بسته",
    },
    outcome: {
      win: "برد",
      loss: "باخت",
      breakeven: "سربه‌سر",
    },
    direction: {
      long: "لانگ",
      short: "شورت",
    },
    marketType: {
      crypto: "ارز دیجیتال",
      forex: "فارکس",
      stocks: "سهام",
      futures: "فیوچرز",
      indices: "شاخص",
      commodities: "کالا",
      other: "سایر",
    },
    session: {
      asia: "آسیا",
      london: "لندن",
      newyork: "نیویورک",
      overlap: "هم‌پوشانی لندن/نیویورک",
      offhours: "خارج از سشن اصلی",
      other: "سایر",
      unknown: "ثبت نشده",
    },
    timeframe: {
      "1m": "۱ دقیقه",
      "5m": "۵ دقیقه",
      "15m": "۱۵ دقیقه",
      "30m": "۳۰ دقیقه",
      "1h": "۱ ساعت",
      "4h": "۴ ساعت",
      "1d": "روزانه",
      "1w": "هفتگی",
      multi: "چندتایم‌فریم",
      unknown: "ثبت نشده",
    },
    emotion: {
      calm: "آرام و متمرکز",
      confident: "بااعتمادبه‌نفس",
      anxious: "مضطرب",
      fomo: "فومو",
      revenge: "انتقامی",
      impatient: "بی‌صبر",
      tired: "خسته",
      unknown: "ثبت نشده",
    },
    planFollowed: {
      yes: "پایبندی کامل",
      partial: "پایبندی نسبی",
      no: "خارج از پلن",
      unknown: "ثبت نشده",
    },
    mistakeType: {
      none: "بدون اشتباه",
      "early-entry": "ورود زودهنگام",
      "late-entry": "ورود دیرهنگام",
      oversize: "حجم بیش‌ازحد",
      "moved-stop": "جابه‌جایی حد ضرر",
      "early-exit": "خروج زودهنگام",
      "late-exit": "خروج دیرهنگام",
      "no-stop": "بدون حد ضرر",
      revenge: "معاملهٔ انتقامی",
      other: "سایر",
    },
    setupQuality: {
      1: "کیفیت ۱",
      2: "کیفیت ۲",
      3: "کیفیت ۳",
      4: "کیفیت ۴",
      5: "کیفیت ۵",
      unknown: "ثبت نشده",
    },
    weekpart: {
      weekday: "روزهای کاری",
      weekend: "آخرهفتهٔ تعریف‌شده",
      unknown: "تاریخ ثبت نشده",
    },
    timebucket: {
      dawn: "بامداد (۰۰–۰۶)",
      morning: "صبح (۰۶–۱۲)",
      afternoon: "بعدازظهر (۱۲–۱۸)",
      evening: "شب (۱۸–۲۴)",
      unknown: "ساعت ثبت نشده",
    },
  };
  const WEEKDAY_LABELS = [
    "یکشنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنجشنبه",
    "جمعه",
    "شنبه",
  ];
  const WEEKDAY_UI_ORDER = [6, 0, 1, 2, 3, 4, 5];
  const PERSIAN_MONTHS = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  const PERSIAN_WEEK_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  const CSV_COLUMNS = [
    "id",
    "accountId",
    "accountName",
    "status",
    "openDate",
    "openTime",
    "closeDate",
    "closeTime",
    "symbol",
    "marketType",
    "direction",
    "strategy",
    "timeframe",
    "session",
    "confirmations",
    "setupQuality",
    "emotion",
    "confidence",
    "planFollowed",
    "mistakeType",
    "entry",
    "stop",
    "target",
    "quantity",
    "exit",
    "fees",
    "entryReason",
    "exitReason",
    "lesson",
    "screenshotRef",
    "notes",
    "createdAt",
    "updatedAt",
    "plannedRisk",
    "plannedReward",
    "plannedRR",
    "grossPnl",
    "netPnl",
    "realizedR",
    "outcome",
    "marketTypeLabel",
    "sessionLabel",
    "timeframeLabel",
    "emotionLabel",
    "planFollowedLabel",
    "mistakeTypeLabel",
    "maxUnrealizedProfit",
    "maxUnrealizedLoss",
    "maxTouchedR",
    "strategies",
    "emotions",
    "mistakeTypes",
    "timeframes",
    "sessions",
    "strategiesLabels",
    "emotionsLabels",
    "mistakeTypesLabels",
    "timeframesLabels",
    "sessionsLabels",
    "partialExits",
    "timeframeDirections",
    "confirmationValues",
    "accountCurrency",
    "instrument",
    "initialPlan",
    "fills",
    "entryFxRate",
    "exitFxRate",
    "feesCurrency",
    "feeFxRate",
  ];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));
  const setAriaInvalid = (control, invalid) => {
    if (invalid) control.setAttribute("aria-invalid", "true");
    else control.removeAttribute("aria-invalid");
  };
  const today = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
  };
  const currentTime = () => new Date().toTimeString().slice(0, 5);
  const nowIso = () => new Date().toISOString();
  const toEnglishDigits = (value) =>
    String(value ?? "")
      .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
  const toPersianDigits = (value) =>
    String(value ?? "")
      .replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)])
      .replace(/\./g, "٫")
      .replace(/-/g, "−");
  const normalizeNumericString = (value) =>
    toEnglishDigits(value)
      .trim()
      .replace(/[٬،,\s\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "")
      .replace(/٫/g, ".")
      .replace(/[−–—]/g, "-");
  const parseLocalizedNumber = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const normalized = normalizeNumericString(value);
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(normalized))
      return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  };
  const formatEditableNumber = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const source =
      typeof value === "number" ? String(value) : normalizeNumericString(value);
    return toPersianDigits(source);
  };
  const finiteNumber = (value) => {
    return parseLocalizedNumber(value);
  };
  const positiveNumber = (value) => {
    const number = finiteNumber(value);
    return number !== null && number > 0 ? number : null;
  };
  // Missing excursion observations are unknown; a recorded zero is meaningful.
  const parseExcursion = (value) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return {
        valid: true,
        value: null,
      };
    }
    const number =
      typeof value === "number" || typeof value === "string"
        ? finiteNumber(value)
        : null;
    return {
      valid: number !== null && number >= 0,
      value: number !== null && number >= 0 ? number : null,
    };
  };
  // Peak favorable excursion is gross, divided by the saved initial account-currency risk.
  // Never infer an unobserved excursion or rebuild that risk from an edited stop or target.
  const calculateMaxTouchedR = (trade) => {
    return trade ? services.maximumTouchedR(trade) : null;
  };
  const meetsRThreshold = (value, threshold) =>
    value >= threshold ||
    threshold - value <=
      Number.EPSILON * 16 * Math.max(Math.abs(value), Math.abs(threshold));
  const hasTouchedR = (trade, threshold) => {
    const type = typeof threshold;
    const target =
      type === "number" || type === "string" ? finiteNumber(threshold) : null;
    const value = calculateMaxTouchedR(trade);
    return (
      target !== null &&
      target >= 0 &&
      value !== null &&
      meetsRThreshold(value, target)
    );
  };
  const MAX_TOUCHED_R_BUCKETS = Object.freeze([
    Object.freeze(["unknown", "ثبت نشده / ریسک نامعتبر"]),
    Object.freeze(["lt1", "کمتر از ۱R"]),
    Object.freeze(["1to2", "از ۱ تا کمتر از ۲R"]),
    Object.freeze(["2to3", "از ۲ تا کمتر از ۳R"]),
    Object.freeze(["3to4", "از ۳ تا کمتر از ۴R"]),
    Object.freeze(["4to5", "از ۴ تا کمتر از ۵R"]),
    Object.freeze(["gte5", "۵R یا بیشتر"]),
  ]);
  const maxTouchedRBucket = (trade) => {
    const value = calculateMaxTouchedR(trade);
    if (value === null) return "unknown";
    if (meetsRThreshold(value, 5)) return "gte5";
    if (meetsRThreshold(value, 4)) return "4to5";
    if (meetsRThreshold(value, 3)) return "3to4";
    if (meetsRThreshold(value, 2)) return "2to3";
    if (meetsRThreshold(value, 1)) return "1to2";
    return "lt1";
  };
  const clampText = (value, max) =>
    String(value ?? "")
      .trim()
      .slice(0, max);
  const validDate = (value) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [
      31,
      leap ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];
    return day <= daysInMonth[month - 1];
  };
  const validTime = (value) => {
    return Boolean(canonicalTime(value));
  };
  const canonicalTime = (value) => {
    const normalized = toEnglishDigits(value).trim().replace(/[٫.]/g, ":");
    if (!normalized) return "";
    const match = /^(\d{1,2}):(\d{1,2})$/.exec(normalized);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return (
      String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0")
    );
  };
  const formatPersianTime = (value) => {
    const normalized = canonicalTime(value);
    return normalized === null
      ? String(value || "")
      : toPersianDigits(normalized);
  };
  const PERSIAN_DATE_PARTS = new Intl.DateTimeFormat(
    "en-US-u-ca-persian-nu-latn",
    {
      calendar: "persian",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    },
  );
  const gregorianToJalali = (iso) => {
    if (!validDate(iso)) return null;
    const [year, month, day] = iso.split("-").map(Number);
    const parts = Object.fromEntries(
      PERSIAN_DATE_PARTS.formatToParts(
        new Date(Date.UTC(year, month - 1, day)),
      ).map((part) => [part.type, part.value]),
    );
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    };
  };
  const compareJalali = (left, right) =>
    left.year - right.year || left.month - right.month || left.day - right.day;
  const jalaliToGregorian = (yearValue, monthValue, dayValue) => {
    const year = Number(toEnglishDigits(yearValue));
    const month = Number(toEnglishDigits(monthValue));
    const day = Number(toEnglishDigits(dayValue));
    if (
      !Number.isInteger(year) ||
      year < 1200 ||
      year > 1600 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(day) ||
      day < 1 ||
      day > 31
    )
      return null;
    const target = {
      year,
      month,
      day,
    };
    const dayMs = 86400000;
    let low = Math.floor(Date.UTC(year + 620, 0, 1) / dayMs);
    let high = Math.floor(Date.UTC(year + 622, 11, 31) / dayMs);
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const iso = new Date(middle * dayMs).toISOString().slice(0, 10);
      const candidate = gregorianToJalali(iso);
      const comparison = compareJalali(candidate, target);
      if (comparison === 0) return iso;
      if (comparison < 0) low = middle + 1;
      else high = middle - 1;
    }
    return null;
  };
  const parsePersianDate = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return validDate(raw) ? raw : null;
    const normalized = toEnglishDigits(raw).replace(/[.٫-]/g, "/");
    const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
    return match ? jalaliToGregorian(match[1], match[2], match[3]) : null;
  };
  const formatPersianDateInput = (iso) => {
    const parts = gregorianToJalali(iso);
    if (!parts) return "";
    return toPersianDigits(
      String(parts.year).padStart(4, "0") +
        "/" +
        String(parts.month).padStart(2, "0") +
        "/" +
        String(parts.day).padStart(2, "0"),
    );
  };
  const shiftIsoDate = (iso, days) => {
    if (!validDate(iso)) return null;
    const [year, month, day] = iso.split("-").map(Number);
    const shifted = new Date(Date.UTC(year, month - 1, day + days));
    return shifted.toISOString().slice(0, 10);
  };
  const normalizeList = (value) => {
    let source;
    if (Array.isArray(value)) {
      source = value;
    } else {
      const text = String(value || "").trim();
      if (text.startsWith("[")) {
        try {
          const parsed = JSON.parse(text);
          source = Array.isArray(parsed) ? parsed : text.split("|");
        } catch (error) {
          source = text.split("|");
        }
      } else {
        // Keep compatibility with CSV files exported by version 1 and early version 2.
        source = text.split("|");
      }
    }
    return [
      ...new Set(source.map((item) => clampText(item, 50)).filter(Boolean)),
    ].slice(0, 25);
  };
  const makeId = () => {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function")
      return globalThis.crypto.randomUUID();
    return (
      "trade-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  };

  // Keep primary scalar fields for older readers; plural fields carry every selected option.
  const MULTI_OPTION_FIELDS = {
    strategy: "strategies",
    emotion: "emotions",
    mistakeType: "mistakeTypes",
    timeframe: "timeframes",
    session: "sessions",
  };
  const parseMultiOptionValues = (value) => {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [value];
  };
  const OPTION_GROUPS = {
    confirmations: {
      title: "تأییدیه‌های تکنیکال",
      max: 50,
      text: true,
    },
    strategy: {
      title: "استراتژی / ستاپ",
      max: 80,
      text: true,
      fallback: "",
    },
    marketType: {
      title: "بازار",
      select: "market-type",
      fallback: "other",
    },
    session: {
      title: "سشن معاملاتی",
      select: "session",
      fallback: "unknown",
    },
    timeframe: {
      title: "تایم‌فریم",
      select: "timeframe",
      fallback: "unknown",
    },
    emotion: {
      title: "حالت ذهنی",
      select: "emotion",
      fallback: "unknown",
    },
    planFollowed: {
      title: "پایبندی به پلن",
      select: "plan-followed",
      fallback: "unknown",
    },
    mistakeType: {
      title: "اشتباه اصلی",
      select: "mistake-type",
      fallback: "none",
    },
  };
  const DEFAULT_OPTIONS = Object.fromEntries(
    Object.entries(OPTION_GROUPS).map(([group, config]) => [
      group,
      group === "confirmations"
        ? DEFAULT_CONFIRMATIONS.map((label) => ({
            id: label,
            label,
            description: "",
            active: true,
          }))
        : config.select
          ? [...document.getElementById(config.select).options].map(
              (option) => ({
                id: option.value,
                label: option.textContent,
                description: "",
                active: true,
              }),
            )
          : [],
    ]),
  );
  const optionNameKey = (value) =>
    String(value)
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("fa");
  const optionTradeValues = (trade, group) => {
    if (group === "confirmations") return normalizeList(trade.confirmations);
    const plural = MULTI_OPTION_FIELDS[group];
    // A legacy scalar is one label: a pipe can legitimately be part of a setup name.
    const source =
      plural && Object.hasOwn(trade, plural)
        ? parseMultiOptionValues(trade[plural])
        : Array.isArray(trade[group])
          ? trade[group]
          : trade[group] == null || trade[group] === ""
            ? []
            : [trade[group]];
    return source
      .map((value) => clampText(value, group === "strategy" ? 80 : 100))
      .filter(Boolean);
  };
  const recordedOptionLabel = (trade, group, value) => {
    const plural = MULTI_OPTION_FIELDS[group];
    if (plural && Object.hasOwn(trade, plural + "Labels")) {
      const labels = parseMultiOptionValues(trade[plural + "Labels"]);
      const index = optionTradeValues(trade, group).indexOf(value);
      if (index >= 0) return labels[index];
    }
    return value === trade[group] ? trade[group + "Label"] || "" : "";
  };
  const CONFIRMATION_TYPES = [
    "simple",
    "details",
    "direction",
    "direction_details",
  ];
  const CONTEXT_DIRECTIONS = ["bullish", "bearish", "neutral", "unknown"];
  const TIMEFRAME_DIRECTION_KEYS = ["monthly", "weekly", "daily", "h4"];
  const isContextRecord = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const normalizeConfirmationType = (value, fallback = "simple") => {
    if (value === undefined || value === null || value === "") return fallback;
    if (!CONFIRMATION_TYPES.includes(value))
      throw new Error(
        "نوع تأییدیه باید ساده، با جزئیات، جهت‌دار یا جهت‌دار با جزئیات باشد.",
      );
    return value;
  };
  const normalizeContextDirection = (value) => {
    if (value === undefined || value === null || value === "") return "unknown";
    if (!CONTEXT_DIRECTIONS.includes(value))
      throw new Error("جهت باید صعودی، نزولی، خنثی یا ثبت‌نشده باشد.");
    return value;
  };
  const parseContextJSON = (raw, label) => {
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(label + " باید JSON معتبر باشد.");
    }
  };
  const normalizeTimeframeDirections = (raw) => {
    const source =
      raw == null || raw === ""
        ? {}
        : parseContextJSON(raw, "جهت تایم‌فریم‌ها");
    if (
      !isContextRecord(source) ||
      Object.keys(source).some((key) => !TIMEFRAME_DIRECTION_KEYS.includes(key))
    ) {
      throw new Error(
        "جهت تایم‌فریم‌ها باید شامل ماهانه، هفتگی، روزانه و ۴ ساعت باشد.",
      );
    }
    return Object.fromEntries(
      TIMEFRAME_DIRECTION_KEYS.map((key) => {
        try {
          return [key, normalizeContextDirection(source[key])];
        } catch {
          throw new Error(
            "جهت تایم‌فریم " +
              {
                monthly: "ماهانه",
                weekly: "هفتگی",
                daily: "روزانه",
                h4: "۴ ساعت",
              }[key] +
              " نامعتبر است.",
          );
        }
      }),
    );
  };
  const parseConfirmationSnapshots = (raw) => {
    if (raw == null || raw === "") return [];
    const source = parseContextJSON(raw, "جزئیات تأییدیه‌ها");
    if (!Array.isArray(source) || source.length > 25)
      throw new Error("جزئیات تأییدیه‌ها باید فهرستی با حداکثر ۲۵ گزینه باشد.");
    return source;
  };
  const confirmationSnapshotType = (trade, id) => {
    const snapshot = parseConfirmationSnapshots(trade.confirmationValues).find(
      (item) => isContextRecord(item) && item.id === id,
    );
    return normalizeConfirmationType(snapshot?.type);
  };
  const normalizeConfirmationValues = (raw, confirmations, catalogs = null) => {
    const selected = new Set(confirmations);
    const snapshots = new Map();
    for (const item of parseConfirmationSnapshots(raw)) {
      if (
        !isContextRecord(item) ||
        typeof item.id !== "string" ||
        !item.id.trim() ||
        item.id.trim().length > 50
      ) {
        throw new Error("شناسهٔ جزئیات تأییدیه نامعتبر است.");
      }
      const id = item.id.trim();
      if (!selected.has(id))
        throw new Error(
          "جزئیات تأییدیه به گزینه‌ای انتخاب‌نشده اشاره می‌کند: " + id,
        );
      const catalogType = normalizeConfirmationType(
        catalogs?.confirmations?.find((option) => option.id === id)?.type,
      );
      let type;
      try {
        type = normalizeConfirmationType(item.type, catalogType);
      } catch (error) {
        throw new Error(error.message + " تأییدیه: " + id, {
          cause: error,
        });
      }
      if (item.details != null && typeof item.details !== "string")
        throw new Error("جزئیات تأییدیه باید متن باشد: " + id);
      const details = (item.details || "").trim();
      if (details.length > 1000)
        throw new Error("جزئیات هر تأییدیه حداکثر ۱۰۰۰ نویسه است: " + id);
      let direction;
      try {
        direction = normalizeContextDirection(item.direction);
      } catch {
        throw new Error("جهت تأییدیه نامعتبر است: " + id);
      }
      const snapshot = {
        id,
        type,
        details,
        direction,
      };
      if (
        snapshots.has(id) &&
        JSON.stringify(snapshots.get(id)) !== JSON.stringify(snapshot)
      ) {
        throw new Error(
          "جزئیات تکراری و متفاوت برای تأییدیه ثبت شده است: " + id,
        );
      }
      snapshots.set(id, snapshot);
    }
    return confirmations.map(
      (id) =>
        snapshots.get(id) || {
          id,
          type: normalizeConfirmationType(
            catalogs?.confirmations?.find((option) => option.id === id)?.type,
          ),
          details: "",
          direction: "unknown",
        },
    );
  };
  const sanitizeOptions = (raw, trades = []) =>
    Object.fromEntries(
      Object.entries(OPTION_GROUPS).map(([group, config]) => {
        // An explicit empty list is intentional; defaults are only seeded for older files.
        const hasCatalog = Array.isArray(raw?.[group]);
        const source = hasCatalog ? raw[group] : DEFAULT_OPTIONS[group];
        const entries = [];
        const ids = new Set();
        for (const item of source) {
          if (!item || typeof item !== "object") continue;
          const label = clampText(item.label, config.max || 50);
          const id = config.text ? label : clampText(item.id, 100);
          if (
            !label ||
            !id ||
            ids.has(id) ||
            (!config.text && !/^[a-zA-Z0-9_-]+$/.test(id))
          )
            continue;
          entries.push({
            id,
            label,
            description: clampText(item.description, 1000),
            active: item.active !== false,
            ...(group === "confirmations"
              ? {
                  type: normalizeConfirmationType(item.type),
                }
              : {}),
          });
          ids.add(id);
        }
        if (config.select) {
          const fallback = entries.find((item) => item.id === config.fallback);
          if (fallback) fallback.active = true;
          else {
            entries.push({
              ...DEFAULT_OPTIONS[group].find(
                (item) => item.id === config.fallback,
              ),
            });
            ids.add(config.fallback);
          }
        }
        // Keep historical values available for review without restoring retired choices.
        for (const trade of trades)
          for (const value of optionTradeValues(trade, group)) {
            if (ids.has(value)) continue;
            if (!config.text && !/^[a-zA-Z0-9_-]+$/.test(value)) continue;
            const label = config.text
              ? value
              : clampText(recordedOptionLabel(trade, group, value), 50) ||
                LABELS[group]?.[value] ||
                value;
            entries.push({
              id: value,
              label,
              description: "",
              active: !hasCatalog,
              ...(group === "confirmations"
                ? {
                    type: confirmationSnapshotType(trade, value),
                  }
                : {}),
            });
            ids.add(value);
          }
        return [group, entries];
      }),
    );
  const normalizeOptionValue = (group, value, catalogs) => {
    const id = clampText(value, 100);
    return Object.hasOwn(LABELS[group], id) ||
      catalogs?.[group]?.some((item) => item.id === id) ||
      /^custom-[a-zA-Z0-9-]+$/.test(id)
      ? id
      : OPTION_GROUPS[group].fallback;
  };
  const normalizeOptionValues = (group, raw, catalogs) => {
    const config = OPTION_GROUPS[group];
    const values = parseMultiOptionValues(raw)
      .map((value) =>
        config.text
          ? clampText(value, config.max || 50)
          : normalizeOptionValue(group, value, catalogs),
      )
      .filter(Boolean);
    const unique = [...new Set(values)];
    const concrete = unique.filter((value) => value !== config.fallback);
    return (
      concrete.length ? concrete : config.fallback ? [config.fallback] : []
    ).slice(0, 25);
  };

  // Pure catalog recovery: never reads or changes the current journal's trades/settings.
  const mergeCatalogRecovery = (currentOptions, payload) => {
    const record = (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value);
    if (
      !record(payload) ||
      ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, VERSION].includes(
        payload.version,
      ) ||
      !Array.isArray(payload.trades) ||
      (payload.options != null && !record(payload.options))
    ) {
      throw new Error("فایل باید پشتیبان JSON معتبر ژورنال اِج باشد.");
    }
    const text = (value, max, field, allowEmpty = false) => {
      if (
        typeof value !== "string" ||
        value.trim().length > max ||
        (!allowEmpty && !value.trim())
      )
        throw new Error("نام یا شناسهٔ نامعتبر در " + field + ".");
      return value.trim();
    };
    const options = {};
    const counts = {
      added: 0,
      updated: 0,
      renamed: 0,
      reactivated: 0,
      archivedAdded: 0,
      conflicts: 0,
      groups: {},
    };
    Object.entries(OPTION_GROUPS).forEach(([group, config]) => {
      const entries = (currentOptions?.[group] || []).map((item) => ({
        ...item,
      }));
      options[group] = entries;
      const candidates = [];
      const candidateKeys = new Set();
      const identity = (item) =>
        config.text ? optionNameKey(item.label) : item.id;
      const addCandidate = (item) => {
        const key = identity(item);
        if (!candidateKeys.has(key)) {
          candidateKeys.add(key);
          candidates.push(item);
        }
      };
      const hasCatalog = Object.hasOwn(payload.options || {}, group);
      if (hasCatalog && !Array.isArray(payload.options[group]))
        throw new Error("فهرست نامعتبر: " + config.title + ".");
      for (const item of hasCatalog ? payload.options[group] : []) {
        if (
          !record(item) ||
          (Object.hasOwn(item, "active") && typeof item.active !== "boolean")
        )
          throw new Error("گزینهٔ نامعتبر در " + config.title + ".");
        const label = text(item.label, config.max || 50, config.title);
        let id = text(
          item.id,
          config.text ? config.max || 50 : 100,
          config.title,
        );
        if (config.text) id = label;
        else if (!/^[a-zA-Z0-9_-]+$/.test(id))
          throw new Error("شناسهٔ نامعتبر در " + config.title + ".");
        const description = Object.hasOwn(item, "description")
          ? text(item.description, 1000, config.title, true)
          : "";
        addCandidate({
          id,
          label,
          description,
          active: item.active !== false,
          ...(group === "confirmations"
            ? {
                type: normalizeConfirmationType(item.type),
                typeProvided: item.type != null && item.type !== "",
              }
            : {}),
        });
      }
      for (const trade of payload.trades) {
        if (!record(trade))
          throw new Error("سابقهٔ معاملات در پشتیبان معتبر نیست.");
        let values = [];
        if (group === "confirmations") {
          if (trade.confirmations == null || trade.confirmations === "")
            continue;
          if (Array.isArray(trade.confirmations)) {
            values = trade.confirmations.map((value) =>
              text(value, config.max, config.title),
            );
          } else if (typeof trade.confirmations === "string") {
            const raw = trade.confirmations.trim();
            const source = raw.startsWith("[")
              ? JSON.parse(raw)
              : raw.split("|").filter((value) => value.trim());
            if (!Array.isArray(source))
              throw new Error("تأییدیه‌های پشتیبان معتبر نیستند.");
            values = source.map((value) =>
              text(value, config.max, config.title),
            );
          } else throw new Error("تأییدیه‌های پشتیبان معتبر نیستند.");
        } else if (
          MULTI_OPTION_FIELDS[group] &&
          Object.hasOwn(trade, MULTI_OPTION_FIELDS[group])
        ) {
          const raw = trade[MULTI_OPTION_FIELDS[group]];
          let source = raw;
          if (typeof source === "string")
            source = source.trim().startsWith("[")
              ? JSON.parse(source)
              : source === ""
                ? []
                : [source];
          if (!Array.isArray(source))
            throw new Error(
              "فهرست چندگزینه‌ای پشتیبان معتبر نیست: " + config.title + ".",
            );
          values = source.map((value) =>
            text(value, config.text ? config.max : 100, config.title),
          );
        } else if (trade[group] != null && trade[group] !== "") {
          values = (
            Array.isArray(trade[group]) ? trade[group] : [trade[group]]
          ).map((value) =>
            text(value, config.text ? config.max : 100, config.title),
          );
        }
        for (const value of values) {
          if (config.text) {
            addCandidate({
              id: value,
              label: value,
              description: "",
              active: true,
              ...(group === "confirmations"
                ? {
                    type: confirmationSnapshotType(trade, value),
                    typeProvided: parseConfirmationSnapshots(
                      trade.confirmationValues,
                    ).some(
                      (item) =>
                        item?.id === value &&
                        item.type != null &&
                        item.type !== "",
                    ),
                  }
                : {}),
            });
          } else {
            if (!/^[a-zA-Z0-9_-]+$/.test(value))
              throw new Error("شناسهٔ نامعتبر در سابقهٔ " + config.title + ".");
            const recordedLabel = recordedOptionLabel(trade, group, value);
            const label =
              recordedLabel != null && recordedLabel !== ""
                ? text(recordedLabel, config.max || 50, config.title)
                : DEFAULT_OPTIONS[group].find((item) => item.id === value)
                    ?.label ||
                  LABELS[group]?.[value] ||
                  value;
            addCandidate({
              id: value,
              label,
              description: "",
              active: true,
            });
          }
        }
      }
      const groupCounts = {
        added: 0,
        updated: 0,
      };
      counts.groups[group] = groupCounts;
      for (const candidate of candidates) {
        const current = entries.find(
          (item) => identity(item) === identity(candidate),
        );
        if (current) {
          let updated = false;
          // A retired backup choice must never retire an active current choice.
          if (!current.active && candidate.active) {
            current.active = true;
            counts.reactivated++;
            updated = true;
          }
          if (!config.text && current.label !== candidate.label) {
            const defaultLabel = DEFAULT_OPTIONS[group].find(
              (item) => item.id === current.id,
            )?.label;
            const labelTaken = entries.some(
              (item) =>
                item.id !== current.id &&
                optionNameKey(item.label) === optionNameKey(candidate.label),
            );
            if (defaultLabel && current.label === defaultLabel && !labelTaken) {
              current.label = candidate.label;
              counts.renamed++;
              updated = true;
            } else counts.conflicts++;
          }
          if (
            group === "confirmations" &&
            candidate.typeProvided &&
            normalizeConfirmationType(current.type) !== candidate.type
          )
            counts.conflicts++;
          if (candidate.description && !current.description) {
            current.description = candidate.description;
            updated = true;
          } else if (
            candidate.description &&
            current.description !== candidate.description
          )
            counts.conflicts++;
          if (updated) {
            counts.updated++;
            groupCounts.updated++;
          }
          continue;
        }
        // Stable IDs remain distinct, but duplicate visible names are not introduced.
        if (
          entries.some(
            (item) =>
              optionNameKey(item.label) === optionNameKey(candidate.label),
          )
        ) {
          counts.conflicts++;
          continue;
        }
        const { typeProvided, ...portableCandidate } = candidate;
        entries.push(portableCandidate);
        counts.added++;
        groupCounts.added++;
        if (!candidate.active) counts.archivedAdded++;
      }
    });
    return {
      options,
      counts,
      changed: counts.added + counts.updated > 0,
    };
  };

  // Recovered personal catalogs are portable across copies; financial settings stay local.
  const RECOVERED_PERSONAL_OPTIONS = {
    confirmations: [
      {
        id: "هم‌جهتی روند تایم بالاتر",
        label: "هم‌جهتی روند تایم بالاتر",
        active: true,
      },
      {
        id: "شکست ساختار (BOS)",
        label: "شکست ساختار (BOS)",
        active: true,
      },
      {
        id: "تغییر ساختار (CHOCH/MSS)",
        label: "تغییر ساختار (CHOCH/MSS)",
        active: true,
      },
      {
        id: "حمایت / مقاومت",
        label: "حمایت / مقاومت",
        active: true,
      },
      {
        id: "USDT.D",
        label: "USDT.D",
        active: true,
      },
      {
        id: "BTC.D",
        label: "BTC.D",
        active: true,
      },
      {
        id: "پولبک / ریتست",
        label: "پولبک / ریتست",
        active: true,
      },
      {
        id: "الگوی کندلی",
        label: "الگوی کندلی",
        active: true,
      },
      {
        id: "حجم",
        label: "حجم",
        active: true,
      },
      {
        id: "واگرایی",
        label: "واگرایی",
        active: true,
      },
      {
        id: "TOTAL 2",
        label: "TOTAL 2",
        active: true,
      },
      {
        id: "Pair BTC",
        label: "Pair BTC",
        active: true,
      },
      {
        id: "Very Strong",
        label: "Very Strong",
        active: true,
      },
      {
        id: "Strong",
        label: "Strong",
        active: true,
      },
      {
        id: "Normal",
        label: "Normal",
        active: true,
      },
      {
        id: "Weak",
        label: "Weak",
        active: true,
      },
    ],
    strategy: [
      {
        id: "BO 1T",
        label: "BO 1T",
        active: true,
      },
      {
        id: "BO 2T",
        label: "BO 2T",
        active: true,
      },
      {
        id: "BO 3T",
        label: "BO 3T",
        active: true,
      },
      {
        id: "BO +3T",
        label: "BO +3T",
        active: true,
      },
      {
        id: "Pre BO",
        label: "Pre BO",
        active: true,
      },
      {
        id: "Reaction (spike)",
        label: "Reaction (spike)",
        active: true,
      },
      {
        id: "Reaction (channel)",
        label: "Reaction (channel)",
        active: true,
      },
      {
        id: "Reaction(range)",
        label: "Reaction(range)",
        active: true,
      },
      {
        id: "News Trading",
        label: "News Trading",
        active: true,
      },
      {
        id: "Others Signal",
        label: "Others Signal",
        active: true,
      },
    ],
    marketType: [
      {
        id: "crypto",
        label: "ارز دیجیتال",
        active: true,
      },
      {
        id: "forex",
        label: "فارکس",
        active: true,
      },
      {
        id: "futures",
        label: "فیوچرز",
        active: true,
      },
      {
        id: "indices",
        label: "شاخص",
        active: true,
      },
      {
        id: "other",
        label: "سایر",
        active: true,
      },
    ],
    session: [
      {
        id: "unknown",
        label: "ثبت نشده",
        active: true,
      },
      {
        id: "asia",
        label: "آسیا",
        active: true,
      },
      {
        id: "london",
        label: "لندن",
        active: true,
      },
      {
        id: "newyork",
        label: "نیویورک",
        active: true,
      },
      {
        id: "overlap",
        label: "هم‌پوشانی لندن/نیویورک",
        active: true,
      },
      {
        id: "offhours",
        label: "خارج از سشن اصلی",
        active: true,
      },
      {
        id: "other",
        label: "سایر",
        active: true,
      },
    ],
    timeframe: [
      {
        id: "unknown",
        label: "ثبت نشده",
        active: true,
      },
      {
        id: "15m",
        label: "۱۵ دقیقه",
        active: true,
      },
      {
        id: "30m",
        label: "۳۰ دقیقه",
        active: true,
      },
      {
        id: "1h",
        label: "۱ ساعت",
        active: true,
      },
      {
        id: "4h",
        label: "۴ ساعت",
        active: true,
      },
      {
        id: "1d",
        label: "روزانه",
        active: true,
      },
      {
        id: "1w",
        label: "هفتگی",
        active: true,
      },
      {
        id: "multi",
        label: "چندتایم‌فریم",
        active: true,
      },
    ],
    emotion: [
      {
        id: "unknown",
        label: "ثبت نشده",
        active: true,
      },
      {
        id: "calm",
        label: "آرام و متمرکز",
        active: true,
      },
      {
        id: "confident",
        label: "بااعتمادبه‌نفس",
        active: true,
      },
      {
        id: "anxious",
        label: "مضطرب",
        active: true,
      },
      {
        id: "fomo",
        label: "فومو",
        active: true,
      },
      {
        id: "revenge",
        label: "انتقامی",
        active: true,
      },
      {
        id: "impatient",
        label: "بی‌صبر",
        active: true,
      },
      {
        id: "tired",
        label: "خسته",
        active: true,
      },
      {
        id: "custom-b7f6570a-a75c-4f31-9e6f-931476cca854",
        label: "کم خوابی",
        active: true,
      },
      {
        id: "custom-fb5a708c-7873-4763-b5c8-6643503bd500",
        label: "فشار بعد استاپ",
        active: true,
      },
      {
        id: "custom-b59a3159-79e6-4626-9f0c-7b827ce9a246",
        label: "بی حال و حوصله",
        active: true,
      },
      {
        id: "custom-f960b40f-5a7a-4fa2-af2a-a6eebea6e883",
        label: "نا مطمعن",
        active: true,
      },
      {
        id: "custom-2dfd82ae-54fa-4d9b-8482-eeef39411d33",
        label: "امیدوار",
        active: true,
      },
      {
        id: "custom-91db4f69-0db6-4ae9-9269-5d465774570c",
        label: "خوشبین بیش از حد",
        active: true,
      },
    ],
    planFollowed: [
      {
        id: "unknown",
        label: "ثبت نشده",
        active: true,
      },
      {
        id: "yes",
        label: "کامل",
        active: true,
      },
      {
        id: "partial",
        label: "نسبی",
        active: true,
      },
      {
        id: "no",
        label: "خیر",
        active: true,
      },
    ],
    mistakeType: [
      {
        id: "none",
        label: "بدون اشتباه",
        active: true,
      },
      {
        id: "early-entry",
        label: "ورود زودهنگام",
        active: true,
      },
      {
        id: "late-entry",
        label: "ورود دیرهنگام",
        active: true,
      },
      {
        id: "oversize",
        label: "حجم بیش‌ازحد",
        active: true,
      },
      {
        id: "moved-stop",
        label: "جابه‌جایی حد ضرر",
        active: true,
      },
      {
        id: "early-exit",
        label: "خروج زودهنگام",
        active: true,
      },
      {
        id: "late-exit",
        label: "خروج دیرهنگام",
        active: true,
      },
      {
        id: "no-stop",
        label: "بدون حد ضرر",
        active: true,
      },
      {
        id: "revenge",
        label: "معاملهٔ انتقامی",
        active: true,
      },
      {
        id: "other",
        label: "سایر",
        active: true,
      },
      {
        id: "custom-d788670a-eb38-45b8-bc54-f18a1ef0879b",
        label: "خلاف روند اصلی",
        active: true,
      },
      {
        id: "custom-39b49423-48ab-4422-b966-45e5f255256e",
        label: "سیگنال بقیه",
        active: true,
      },
    ],
  };
  const DEFAULT_ACCOUNT_ID = "account-main";
  const normalizeAccountId = (value) =>
    typeof value === "string" ? clampText(value, 100) : "";
  const defaultAccount = (settings = {}) => ({
    id: DEFAULT_ACCOUNT_ID,
    name: "حساب اصلی",
    currency: String(settings.currency || "USD"),
    description: "",
    accountBalance: positiveNumber(settings.accountBalance) ?? 10000,
    riskMode: settings.riskMode === "fixed" ? "fixed" : "percent",
    riskPercent:
      positiveNumber(settings.riskPercent) !== null &&
      positiveNumber(settings.riskPercent) <= 100
        ? positiveNumber(settings.riskPercent)
        : 1,
    fixedRisk: positiveNumber(settings.fixedRisk) ?? 100,
    archived: false,
  });
  const sanitizeAccounts = (raw, settings = {}, trades = []) => {
    const fallback = defaultAccount(settings);
    const accounts = [];
    const seen = new Set();
    if (Array.isArray(raw))
      for (const item of raw) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const id = normalizeAccountId(item.id);
        if (!id || seen.has(id)) continue;
        const riskPercent = positiveNumber(item.riskPercent);
        accounts.push({
          id,
          name:
            clampText(item.name, 80) ||
            (id === DEFAULT_ACCOUNT_ID
              ? fallback.name
              : "حساب بازیابی‌شده · " + id.slice(0, 32)),
          currency:
            clampText(item.currency, 8).toUpperCase() || fallback.currency,
          description: clampText(item.description, 1000),
          accountBalance:
            positiveNumber(item.accountBalance) ?? fallback.accountBalance,
          riskMode: item.riskMode === "fixed" ? "fixed" : "percent",
          riskPercent:
            riskPercent !== null && riskPercent <= 100
              ? riskPercent
              : fallback.riskPercent,
          fixedRisk: positiveNumber(item.fixedRisk) ?? fallback.fixedRisk,
          archived: item.archived === true,
        });
        seen.add(id);
      }
    if (!accounts.length) {
      accounts.push(fallback);
      seen.add(fallback.id);
    }
    for (const trade of Array.isArray(trades) ? trades : []) {
      const id = normalizeAccountId(trade?.accountId) || DEFAULT_ACCOUNT_ID;
      if (seen.has(id)) continue;
      accounts.push({
        ...fallback,
        id,
        name:
          id === DEFAULT_ACCOUNT_ID
            ? fallback.name
            : "حساب بازیابی‌شده · " + id.slice(0, 32),
        description:
          id === DEFAULT_ACCOUNT_ID
            ? ""
            : "شناسهٔ این حساب از سابقهٔ معاملات بازیابی شده است. نام و تنظیمات حساب را بررسی کن.",
      });
      seen.add(id);
    }
    return accounts;
  };
  const getAccountById = (id, accounts = state.accounts) =>
    accounts.find((account) => account.id === id) || null;
  const defaultState = () => ({
    version: VERSION,
    settings: {
      currency: "USD",
      accountBalance: 10000,
      riskMode: "percent",
      riskPercent: 1,
      fixedRisk: 100,
      weekendDays: [4, 5],
    },
    accounts: [defaultAccount()],
    options: sanitizeOptions(RECOVERED_PERSONAL_OPTIONS),
    trades: [],
  });
  let startupWarning = "";
  const loadState = async () =>
    services.load(
      IS_DEMO ? "demo" : "live",
      IS_DEMO ? createDemoState() : defaultState(),
      (payload) => {
        const settings = sanitizeSettings(
          payload.settings || {},
          payload.version,
        );
        const options = sanitizeOptions(
          payload.options,
          payload.trades.filter((item) => item && typeof item === "object"),
        );
        const trades = [],
          rejected = [],
          ids = new Set();
        for (let index = 0; index < payload.trades.length; index++) {
          const raw = payload.trades[index];
          const account = Array.isArray(payload.accounts)
            ? payload.accounts.find((item) => item?.id === raw?.accountId)
            : null;
          const result = normalizeTrade(
            raw && typeof raw === "object"
              ? {
                  ...raw,
                  accountCurrency: account?.currency || settings.currency,
                }
              : raw,
            options,
          );
          if (!result.trade || ids.has(result.trade.id))
            rejected.push({
              index,
              raw,
              reasons: result.errors.length
                ? result.errors
                : ["شناسهٔ تکراری است."],
            });
          else {
            ids.add(result.trade.id);
            trades.push(result.trade);
          }
        }
        return {
          data: {
            version: VERSION,
            settings,
            accounts: sanitizeAccounts(payload.accounts, settings, trades),
            options: sanitizeOptions(payload.options, trades),
            trades,
          },
          rejected,
        };
      },
    );
  const sanitizeWeekendDays = (raw, sourceVersion = VERSION) => {
    if (Array.isArray(raw.weekendDays)) {
      const normalized = raw.weekendDays
        .filter(
          (day) =>
            Number.isInteger(day) ||
            (typeof day === "string" && /^[0-6]$/.test(day)),
        )
        .map(Number);
      return [...new Set(normalized)].sort((a, b) => a - b);
    }
    if (sourceVersion === 1 || sourceVersion === 2)
      return raw.weekendMode === "iran" ? [4, 5] : [0, 6];
    return [4, 5];
  };
  const sanitizeSettings = (raw, sourceVersion = VERSION) => {
    const defaults = defaultState().settings;
    const currency =
      clampText(raw.currency, 8)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "") || defaults.currency;
    const riskPercent = positiveNumber(raw.riskPercent);
    return {
      currency,
      accountBalance:
        positiveNumber(raw.accountBalance) ?? defaults.accountBalance,
      riskMode: raw.riskMode === "fixed" ? "fixed" : "percent",
      riskPercent:
        riskPercent !== null && riskPercent <= 100
          ? riskPercent
          : defaults.riskPercent,
      fixedRisk: positiveNumber(raw.fixedRisk) ?? defaults.fixedRisk,
      weekendDays: sanitizeWeekendDays(raw, sourceVersion),
    };
  };
  function calculatePlan(input) {
    return services.calculatePlan(input);
  }

  // Executed partial exits use a percentage of the original position and its
  // saved initial account-currency risk. These are risk-based journal records,
  // not broker fills; the implied execution prices are shown for clarity.
  const PARTIAL_PERCENT_TOLERANCE = 1e-9;
  const MAX_PARTIAL_EXITS = 50;
  function calculatePartialExits(input, plan = calculatePlan(input)) {
    let partialExits = input.partialExits;
    try {
      if (typeof partialExits === "string")
        partialExits = partialExits.trim() ? JSON.parse(partialExits) : [];
      if (Array.isArray(partialExits))
        partialExits = partialExits.map((row, index) => ({
          ...row,
          id: row?.id || "partial-" + (index + 1),
          date: row?.date ? parsePersianDate(row.date) : "",
          time: row?.time ? canonicalTime(row.time) : "",
        }));
      if (
        (!partialExits ||
          (Array.isArray(partialExits) && !partialExits.length)) &&
        !input.fills?.length
      )
        return {
          valid: true,
          errors: [],
          exits: [],
          derivedExits: [],
          closedPercent: 0,
          remainingPercent: 100,
          remainingQuantity: plan.valid ? plan.quantity : null,
          weightedR: 0,
          grossPnl: 0,
          netPnlToDate: 0,
          baselineRisk:
            positiveNumber(input.plannedRisk) ??
            (plan.valid ? plan.plannedRisk : null),
        };
      return services.calculatePartials({ ...input, partialExits });
    } catch (error) {
      return {
        valid: false,
        errors: ["خروج پله‌ای: " + error.message],
        exits: [],
        derivedExits: [],
      };
    }
  }
  function calculateClosed(input) {
    try {
      return services.calculateClosed(input);
    } catch {
      return {
        valid: false,
        grossPnl: null,
        netPnl: null,
        realizedR: null,
        outcome: null,
      };
    }
  }
  function calculateProjectionScenario(input) {
    const rr = positiveNumber(input.rr);
    const winRate = finiteNumber(input.winRate);
    const trades = positiveNumber(input.trades);
    const riskPercent = positiveNumber(input.riskPercent);
    const balance = positiveNumber(input.balance);
    if (
      rr === null ||
      winRate === null ||
      winRate < 0 ||
      winRate > 100 ||
      trades === null ||
      !Number.isInteger(trades) ||
      riskPercent === null ||
      riskPercent >= 100 ||
      balance === null
    ) {
      return {
        valid: false,
      };
    }
    const winFraction = winRate / 100;
    const riskFraction = riskPercent / 100;
    const expectedWins = trades * winFraction;
    const expectedLosses = trades - expectedWins;
    const expectancyR = winFraction * rr - (1 - winFraction);
    const netR = expectancyR * trades;
    const simpleGrowth = netR * riskPercent;
    const simpleFinalBalance = Math.max(0, balance * (1 + simpleGrowth / 100));
    const logCompoundFactor =
      expectedWins * Math.log1p(riskFraction * rr) +
      expectedLosses * Math.log1p(-riskFraction);
    const compoundFactor =
      logCompoundFactor > Math.log(Number.MAX_VALUE)
        ? Infinity
        : Math.exp(logCompoundFactor);
    const compoundGrowth =
      compoundFactor === Infinity ? Infinity : (compoundFactor - 1) * 100;
    const compoundFinalBalance =
      compoundFactor === Infinity || compoundFactor > Number.MAX_VALUE / balance
        ? Infinity
        : balance * compoundFactor;
    const riskAmount = balance * riskFraction;
    const breakEvenWinRate = 100 / (rr + 1);
    const compoundBreakEvenWinRate =
      (-Math.log1p(-riskFraction) /
        (Math.log1p(riskFraction * rr) - Math.log1p(-riskFraction))) *
      100;
    const compoundStopsCoveredPerTarget =
      Math.log1p(riskFraction * rr) / -Math.log1p(-riskFraction);
    const targetsNeededToCoverStops = expectedLosses / rr;
    const compoundTargetsNeededToCoverStops =
      expectedLosses / compoundStopsCoveredPerTarget;
    if (
      ![
        expectedWins,
        expectedLosses,
        expectancyR,
        netR,
        simpleGrowth,
        riskAmount,
        breakEvenWinRate,
        compoundBreakEvenWinRate,
        compoundStopsCoveredPerTarget,
        targetsNeededToCoverStops,
        compoundTargetsNeededToCoverStops,
      ].every(Number.isFinite)
    ) {
      return {
        valid: false,
      };
    }
    return {
      valid: true,
      rr,
      winRate,
      trades,
      riskPercent,
      balance,
      expectedWins,
      expectedLosses,
      expectancyR,
      netR,
      riskAmount,
      simpleGrowth,
      simpleFinalBalance,
      compoundGrowth,
      compoundFinalBalance,
      breakEvenWinRate,
      compoundBreakEvenWinRate,
      stopsCoveredPerTarget: rr,
      compoundStopsCoveredPerTarget,
      targetsNeededToCoverStops,
      compoundTargetsNeededToCoverStops,
    };
  }
  const MAX_TRADE_IMAGES = 6;
  const MAX_TRADE_IMAGE_BYTES = 2 * 1024 * 1024;
  const TRADE_IMAGE_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]);
  let tradeImageDatabasePromise = null;
  function normalizeTradeImages(raw) {
    if (raw == null) return [];
    if (!Array.isArray(raw) || raw.length > MAX_TRADE_IMAGES)
      throw new Error("هر معامله حداکثر ۶ تصویر معتبر می‌تواند داشته باشد.");
    const seen = new Set();
    return raw.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item))
        throw new Error("اطلاعات تصویر معامله نامعتبر است.");
      const { id, type, size, width, height } = item;
      if (
        typeof id !== "string" ||
        id.length > 100 ||
        !/^img-[A-Za-z0-9_-]{1,96}$/.test(id) ||
        seen.has(id)
      )
        throw new Error("شناسهٔ تصویر معامله نامعتبر یا تکراری است.");
      if (
        !TRADE_IMAGE_TYPES.has(type) ||
        !Number.isSafeInteger(size) ||
        size < 1 ||
        size > MAX_TRADE_IMAGE_BYTES ||
        !Number.isSafeInteger(width) ||
        !Number.isSafeInteger(height) ||
        width < 1 ||
        height < 1 ||
        width > 8192 ||
        height > 8192 ||
        width * height > 40000000
      )
        throw new Error("نوع، اندازه یا ابعاد تصویر معامله نامعتبر است.");
      if (item.name != null && typeof item.name !== "string")
        throw new Error("نام تصویر معامله نامعتبر است.");
      seen.add(id);
      return {
        id,
        name: clampText(item.name, 180) || "تصویر معامله",
        type,
        size,
        width,
        height,
      };
    });
  }
  function validateTradeImageAsset(raw) {
    const metadata = normalizeTradeImages([raw])[0];
    if (typeof raw.dataUrl !== "string" || raw.dataUrl.length > 2800000)
      throw new Error("دادهٔ تصویر نامعتبر یا بیش از حد بزرگ است.");
    const match =
      /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
        raw.dataUrl,
      );
    if (!match || match[1] !== metadata.type || match[2].length % 4 !== 0)
      throw new Error("قالب دادهٔ تصویر نامعتبر است.");
    const body = match[2];
    const bytes =
      (body.length / 4) * 3 -
      (body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0);
    if (bytes !== metadata.size || bytes > MAX_TRADE_IMAGE_BYTES)
      throw new Error("اندازهٔ دادهٔ تصویر با اطلاعات آن سازگار نیست.");
    const header = atob(body.slice(0, 24));
    const code = (index) => header.charCodeAt(index);
    const valid =
      metadata.type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every(
            (value, index) => code(index) === value,
          )
        : metadata.type === "image/jpeg"
          ? code(0) === 255 && code(1) === 216 && code(2) === 255
          : metadata.type === "image/webp"
            ? header.slice(0, 4) === "RIFF" && header.slice(8, 12) === "WEBP"
            : header.startsWith("GIF87a") || header.startsWith("GIF89a");
    if (!valid) throw new Error("محتوای فایل با نوع تصویر سازگار نیست.");
    return {
      ...metadata,
      dataUrl: raw.dataUrl,
    };
  }
  const verifyTradeImageDimensions = (asset) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        image.naturalWidth === asset.width &&
        image.naturalHeight === asset.height
          ? resolve(asset)
          : reject(new Error("ابعاد واقعی تصویر با اطلاعات آن سازگار نیست."));
      image.onerror = () =>
        reject(new Error("تصویر آسیب دیده است یا قابل خواندن نیست."));
      image.src = asset.dataUrl;
    });
  function openTradeImageDatabase() {
    if (!globalThis.indexedDB)
      return Promise.reject(
        new Error(
          "ذخیرهٔ تصویر در این مرورگر در دسترس نیست. از مرورگر با پشتیبانی IndexedDB استفاده کن.",
        ),
      );
    if (!tradeImageDatabasePromise) {
      tradeImageDatabasePromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("edge-journal-images:v1", 1);
        let failed = false;
        const fail = (message) => {
          failed = true;
          tradeImageDatabasePromise = null;
          reject(new Error(message));
        };
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("images"))
            request.result.createObjectStore("images", {
              keyPath: "id",
            });
        };
        request.onerror = () =>
          fail(
            "باز کردن محل ذخیرهٔ تصاویر ممکن نشد؛ مجوز ذخیره‌سازی مرورگر را بررسی کن.",
          );
        request.onblocked = () =>
          fail(
            "محل ذخیرهٔ تصاویر در تب دیگری قفل است؛ تب‌های قدیمی ژورنال را ببند و دوباره تلاش کن.",
          );
        request.onsuccess = () => {
          const database = request.result;
          if (failed) {
            database.close();
            return;
          }
          database.onversionchange = () => {
            database.close();
            tradeImageDatabasePromise = null;
          };
          resolve(database);
        };
      });
    }
    return tradeImageDatabasePromise;
  }
  async function getTradeImage(id) {
    return services.getImage(id);
  }
  async function putTradeImage(raw, token) {
    const asset = validateTradeImageAsset(raw);
    await verifyTradeImageDimensions(asset);
    return services.putImage(asset, token);
  }
  function referencedTradeImages(trades) {
    const references = new Map();
    for (const trade of trades)
      for (const image of normalizeTradeImages(trade.images)) {
        const previous = references.get(image.id);
        if (
          previous &&
          (previous.type !== image.type ||
            previous.size !== image.size ||
            previous.width !== image.width ||
            previous.height !== image.height)
        )
          throw new Error("اطلاعات تکراری تصویر در معاملات ناسازگار است.");
        references.set(image.id, image);
      }
    return references;
  }
  const tradeImageMetadataMatches = (image, asset) =>
    image.id === asset.id &&
    image.type === asset.type &&
    image.size === asset.size &&
    image.width === asset.width &&
    image.height === asset.height;
  async function exportImageAssets(trades) {
    const assets = [];
    for (const image of referencedTradeImages(trades).values()) {
      const asset = await getTradeImage(image.id);
      if (!asset || !tradeImageMetadataMatches(image, asset))
        throw new Error(
          "تصویر «" +
            image.name +
            "» در ذخیره‌سازی مرورگر پیدا نشد؛ پشتیبان کامل ساخته نشد.",
        );
      assets.push(asset);
    }
    return assets;
  }
  async function prepareImportedImageAssets(payload, trades) {
    const references = referencedTradeImages(trades);
    if (payload.imageAssets != null && !Array.isArray(payload.imageAssets))
      throw new Error("فهرست تصاویر پشتیبان نامعتبر است.");
    const imported = new Map();
    for (const raw of payload.imageAssets || []) {
      const asset = validateTradeImageAsset(raw);
      if (imported.has(asset.id))
        throw new Error("شناسهٔ تصویر تکراری در پشتیبان وجود دارد.");
      if (!references.has(asset.id))
        throw new Error("تصویر بدون معاملهٔ مرتبط در پشتیبان وجود دارد.");
      await verifyTradeImageDimensions(asset);
      const existing = await getTradeImage(asset.id);
      if (
        existing &&
        (existing.dataUrl !== asset.dataUrl ||
          !tradeImageMetadataMatches(asset, existing))
      )
        throw new Error(
          "شناسهٔ تصویر پشتیبان با تصویر ذخیره‌شدهٔ دیگری تداخل دارد؛ ژورنال فعلی حفظ شد.",
        );
      imported.set(asset.id, asset);
    }
    for (const image of references.values()) {
      const asset = imported.get(image.id) || (await getTradeImage(image.id));
      if (!asset || !tradeImageMetadataMatches(image, asset))
        throw new Error(
          "تصویر «" +
            image.name +
            "» در این پشتیبان یا مرورگر موجود نیست؛ ژورنال فعلی حفظ شد.",
        );
    }
    return [...imported.values()];
  }
  function normalizeTrade(raw, options = null) {
    const cached = services.cachedNormalized(raw);
    if (cached)
      return {
        trade: cached,
        errors: [],
      };
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {
        trade: null,
        errors: ["رکورد معامله باید یک شیء معتبر باشد"],
      };
    }
    if (typeof raw.partialExits === "string") {
      try {
        raw = {
          ...raw,
          partialExits: raw.partialExits.trim()
            ? JSON.parse(raw.partialExits)
            : [],
        };
      } catch (error) {
        return {
          trade: null,
          errors: ["فهرست خروج‌های پله‌ای JSON معتبر نیست: " + error.message],
        };
      }
    }
    const errors = [];
    let images = [];
    try {
      images = normalizeTradeImages(raw.images);
    } catch (error) {
      errors.push(error.message);
    }
    const status = ["planned", "open", "closed"].includes(raw.status)
      ? raw.status
      : null;
    const direction = ["long", "short"].includes(raw.direction)
      ? raw.direction
      : null;
    const symbol = clampText(raw.symbol, 24).toUpperCase();
    const rawOpenDate = clampText(raw.openDate, 16);
    const rawCloseDate = clampText(raw.closeDate, 16);
    const rawOpenTime = clampText(raw.openTime, 8);
    const rawCloseTime = clampText(raw.closeTime, 8);
    const openDate = parsePersianDate(rawOpenDate);
    const closeDate = parsePersianDate(rawCloseDate);
    const openTime = canonicalTime(rawOpenTime);
    const closeTime = canonicalTime(rawCloseTime);
    const marketType = normalizeOptionValue(
      "marketType",
      raw.marketType,
      options,
    );
    const strategies = normalizeOptionValues(
      "strategy",
      optionTradeValues(raw, "strategy"),
      options,
    );
    const timeframes = normalizeOptionValues(
      "timeframe",
      optionTradeValues(raw, "timeframe"),
      options,
    );
    const sessions = normalizeOptionValues(
      "session",
      optionTradeValues(raw, "session"),
      options,
    );
    const strategy = strategies[0] || "";
    const timeframe = timeframes[0] || "unknown";
    const session = sessions[0] || "unknown";
    const confirmations = normalizeList(raw.confirmations);
    let timeframeDirections, confirmationValues;
    try {
      timeframeDirections = normalizeTimeframeDirections(
        raw.timeframeDirections,
      );
    } catch (error) {
      errors.push(error.message);
    }
    try {
      confirmationValues = normalizeConfirmationValues(
        raw.confirmationValues,
        confirmations,
        options,
      );
    } catch (error) {
      errors.push(error.message);
    }
    const setupQualityNumber = finiteNumber(raw.setupQuality);
    const setupQuality =
      Number.isInteger(setupQualityNumber) &&
      setupQualityNumber >= 1 &&
      setupQualityNumber <= 5
        ? setupQualityNumber
        : null;
    const emotions = normalizeOptionValues(
      "emotion",
      optionTradeValues(raw, "emotion"),
      options,
    );
    const emotion = emotions[0] || "unknown";
    const confidenceNumber = finiteNumber(raw.confidence);
    const confidence =
      Number.isInteger(confidenceNumber) &&
      confidenceNumber >= 1 &&
      confidenceNumber <= 5
        ? confidenceNumber
        : null;
    const planFollowed = normalizeOptionValue(
      "planFollowed",
      raw.planFollowed,
      options,
    );
    const mistakeTypes = normalizeOptionValues(
      "mistakeType",
      optionTradeValues(raw, "mistakeType"),
      options,
    );
    const mistakeType = mistakeTypes[0] || "none";
    const priceNumber = (value) =>
      services.numeric(value, Boolean(raw.instrument?.signedPrices));
    const entry = priceNumber(raw.entry);
    const stop = priceNumber(raw.stop);
    const target = priceNumber(raw.target);
    const quantity = services.numeric(raw.quantity);
    const feesBlank =
      raw.fees === "" || raw.fees === null || raw.fees === undefined;
    const fees = feesBlank ? 0 : finiteNumber(raw.fees);
    const profitExcursion = parseExcursion(raw.maxUnrealizedProfit);
    const lossExcursion = parseExcursion(raw.maxUnrealizedLoss);
    const exit =
      raw.exit === "" || raw.exit === null || raw.exit === undefined
        ? null
        : priceNumber(raw.exit);
    const plannedRiskBlank =
      raw.plannedRisk === "" ||
      raw.plannedRisk === null ||
      raw.plannedRisk === undefined;
    const plannedRewardBlank =
      raw.plannedReward === "" ||
      raw.plannedReward === null ||
      raw.plannedReward === undefined;
    const plannedRRBlank =
      raw.plannedRR === "" ||
      raw.plannedRR === null ||
      raw.plannedRR === undefined;
    const savedPlannedRisk = plannedRiskBlank
      ? null
      : services.numeric(raw.plannedRisk);
    const savedPlannedReward = plannedRewardBlank
      ? null
      : services.numeric(raw.plannedReward);
    const savedPlannedRR = plannedRRBlank
      ? null
      : services.numeric(raw.plannedRR);
    if (!status) errors.push("وضعیت معامله نامعتبر است");
    if (!direction) errors.push("جهت معامله باید لانگ یا شورت باشد");
    if (!symbol) errors.push("نماد الزامی است");
    if (!validDate(openDate)) errors.push("تاریخ ورود نامعتبر است");
    if (rawOpenTime && openTime === null) errors.push("ساعت ورود نامعتبر است");
    if (entry === null || stop === null || target === null || quantity === null)
      errors.push("قیمت‌ها و حجم باید عدد مثبت باشند");
    if (fees === null) errors.push("کارمزد باید خالی یا عدد معتبر باشد");
    else if (fees < 0) errors.push("کارمزد نمی‌تواند منفی باشد");
    if (status !== "planned" && !profitExcursion.valid)
      errors.push("بیشترین سود باز باید خالی، صفر یا عدد مثبت و متناهی باشد");
    if (status !== "planned" && !lossExcursion.valid)
      errors.push("بیشترین زیان باز باید خالی، صفر یا عدد مثبت و متناهی باشد");
    if (!plannedRiskBlank && savedPlannedRisk === null)
      errors.push("ریسک برنامهٔ ذخیره‌شده نامعتبر است");
    if (!plannedRewardBlank && savedPlannedReward === null)
      errors.push("پاداش برنامهٔ ذخیره‌شده نامعتبر است");
    if (!plannedRRBlank && savedPlannedRR === null)
      errors.push("نسبت R/R ذخیره‌شده نامعتبر است");
    const plan = calculatePlan({
      ...raw,
      entry,
      stop,
      target,
      quantity,
      direction,
      plannedRisk: savedPlannedRisk,
    });
    if (!plan.valid && entry !== null && stop !== null && target !== null)
      errors.push(plan.reason);
    const partials = calculatePartialExits(
      {
        ...raw,
        status,
        openDate,
        openTime,
        closeDate,
        closeTime,
        entry,
        stop,
        target,
        quantity,
        direction,
        fees,
        plannedRisk: savedPlannedRisk,
      },
      plan,
    );
    errors.push(...partials.errors);
    if (status === "closed") {
      if (!validDate(closeDate))
        errors.push("معاملهٔ بسته به تاریخ خروج معتبر نیاز دارد");
      if (rawCloseTime && closeTime === null)
        errors.push("ساعت خروج نامعتبر است");
      if (exit === null && (!partials.valid || partials.remainingPercent > 0))
        errors.push("معاملهٔ بسته به قیمت خروج مثبت نیاز دارد");
      if (validDate(openDate) && validDate(closeDate) && closeDate < openDate)
        errors.push("تاریخ خروج نمی‌تواند پیش از ورود باشد");
      if (
        openDate === closeDate &&
        validTime(openTime) &&
        validTime(closeTime) &&
        closeTime < openTime
      )
        errors.push("ساعت خروج نمی‌تواند پیش از ساعت ورود باشد");
    }
    if (errors.length)
      return {
        trade: null,
        errors,
      };
    const plannedRisk = savedPlannedRisk ?? plan.plannedRisk;
    const plannedReward = savedPlannedReward ?? plan.plannedReward;
    const plannedRR = savedPlannedRR ?? plan.plannedRR;
    const closed =
      status === "closed"
        ? calculateClosed(
            {
              ...raw,
              entry,
              stop,
              target,
              quantity,
              direction,
              exit,
              fees,
              plannedRisk,
              partialExits:
                Array.isArray(raw.fills) && raw.fills.length
                  ? []
                  : partials.exits,
              status,
              openDate,
              openTime,
              closeDate,
              closeTime,
            },
            plan,
          )
        : null;
    if (status === "closed" && !closed.valid) {
      return {
        trade: null,
        errors: ["اعداد نتیجه خارج از محدودهٔ امن محاسبه‌اند"],
      };
    }
    const trade = {
      id: clampText(raw.id, 100) || makeId(),
      accountId: normalizeAccountId(raw.accountId) || DEFAULT_ACCOUNT_ID,
      status,
      openDate,
      openTime: openTime || "",
      closeDate: status === "closed" ? closeDate : "",
      closeTime: status === "closed" ? closeTime || "" : "",
      symbol,
      marketType,
      direction,
      strategy,
      strategies,
      timeframe,
      timeframes,
      session,
      sessions,
      confirmations,
      timeframeDirections,
      confirmationValues,
      setupQuality,
      emotion,
      emotions,
      confidence,
      planFollowed,
      mistakeType,
      mistakeTypes,
      entry,
      stop,
      target,
      quantity,
      exit: status === "closed" && partials.remainingPercent > 0 ? exit : null,
      partialExits:
        Array.isArray(raw.fills) && raw.fills.length ? [] : partials.exits,
      fees,
      maxUnrealizedProfit: status === "planned" ? null : profitExcursion.value,
      maxUnrealizedLoss: status === "planned" ? null : lossExcursion.value,
      entryReason: clampText(raw.entryReason, 1200),
      exitReason: clampText(raw.exitReason, 1000),
      lesson: clampText(raw.lesson, 1000),
      screenshotRef: clampText(raw.screenshotRef, 500),
      images,
      notes: clampText(raw.notes, 3000),
      createdAt: clampText(raw.createdAt, 40) || nowIso(),
      updatedAt: clampText(raw.updatedAt, 40) || nowIso(),
      plannedRisk,
      plannedReward,
      plannedRR,
      grossPnl: closed?.grossPnl ?? null,
      netPnl: closed?.netPnl ?? null,
      realizedR: closed?.realizedR ?? null,
      outcome: closed?.outcome ?? null,
    };
    try {
      Object.assign(trade, services.enrichTrade(raw, trade));
    } catch (error) {
      return {
        trade: null,
        errors: [error.message],
      };
    }
    return {
      trade,
      errors: [],
    };
  }
  function createDemoState() {
    const payload = JSON.parse(
      document.getElementById("demo-fixture").textContent,
    );
    const options = sanitizeOptions(payload.options, payload.trades);
    const trades = payload.trades.map((raw, index) => {
      const result = normalizeTrade(raw, options);
      if (!result.trade)
        throw new Error(
          "Invalid demo position " +
            (index + 1) +
            ": " +
            result.errors.join("; "),
        );
      return result.trade;
    });
    if (
      trades.length !== 100 ||
      new Set(trades.map((trade) => trade.id)).size !== 100
    )
      throw new Error("Invalid demo dataset size/IDs");
    const settings = sanitizeSettings(payload.settings || {}, payload.version);
    return {
      version: VERSION,
      settings,
      accounts: sanitizeAccounts(payload.accounts, settings, trades),
      options: sanitizeOptions(payload.options, trades),
      trades,
    };
  }
  let state = await loadState();
  let storageBaseline = null;
  try {
    storageBaseline = localStorage.getItem(STORAGE_KEY);
  } catch {}
  const selectedFactorConfirmations = new Set();
  let exactFactorSymbol = null;
  let editingId = null;
  let lastSuggestedSize = null;
  let calcAnnounceTimer = null;
  let projectionSelection = {
    rr: 2,
    winRate: 50,
  };
  let projectionAnnounceTimer = null;
  let nativeInvalidFocusScheduled = false;
  const refs = {
    form: $("#trade-form"),
    formTitle: $("#form-title"),
    formMessage: $("#form-message"),
    editBanner: $("#edit-banner"),
    editBannerText: $("#edit-banner-text"),
    cancelEdit: $("#cancel-edit"),
    saveTrade: $("#save-trade"),
    closeFields: $("#close-fields"),
    excursionFields: $("#excursion-fields"),
    maxUnrealizedProfit: $("#max-unrealized-profit"),
    maxUnrealizedLoss: $("#max-unrealized-loss"),
    closeDate: $("#close-date"),
    closeTime: $("#close-time"),
    exit: $("#exit"),
    currency: $("#currency"),
    accountBalance: $("#account-balance"),
    riskPercent: $("#risk-percent"),
    fixedRisk: $("#fixed-risk"),
    weekendDays: $("#weekend-days"),
    weekendSummary: $("#weekend-summary"),
    percentRiskField: $("#percent-risk-field"),
    fixedRiskField: $("#fixed-risk-field"),
    status: $("#status"),
    marketType: $("#market-type"),
    strategy: $("#strategy"),
    timeframe: $("#timeframe"),
    session: $("#session"),
    setupQuality: $("#setup-quality"),
    emotion: $("#emotion"),
    confidence: $("#confidence"),
    planFollowed: $("#plan-followed"),
    mistakeType: $("#mistake-type"),
    entry: $("#entry"),
    stop: $("#stop"),
    target: $("#target"),
    quantity: $("#quantity"),
    fees: $("#fees"),
    symbol: $("#symbol"),
    openDate: $("#open-date"),
    openTime: $("#open-time"),
    entryReason: $("#entry-reason"),
    exitReason: $("#exit-reason"),
    lesson: $("#lesson"),
    screenshotRef: $("#screenshot-ref"),
    notes: $("#notes"),
    confirmationOptions: $("#confirmation-options"),
    useSuggested: $("#use-suggested"),
    rows: $("#trade-rows"),
    tableCount: $("#table-count"),
    toastRegion: $("#toast-region"),
    filterSymbol: $("#filter-symbol"),
    filterDirection: $("#filter-direction"),
    filterStatus: $("#filter-status"),
    filterSession: $("#filter-session"),
    filterConfirmationMode: $("#filter-confirmation-mode"),
    filterFrom: $("#filter-from"),
    filterTo: $("#filter-to"),
    toDateWrap: $("#to-date-wrap"),
    toggleToDate: $("#toggle-to-date"),
    timeAnalysisMode: $("#time-analysis-mode"),
    behaviorAnalysisMode: $("#behavior-analysis-mode"),
    analysisTableMode: $("#analysis-table-mode"),
    analysisTableRows: $("#analysis-table-rows"),
    analysisTableSummary: $("#analysis-table-summary"),
    projectionTrades: $("#projection-trades"),
    projectionRisk: $("#projection-risk"),
    projectionBalance: $("#projection-balance"),
    projectionMode: $("#projection-mode"),
    projectionHead: $("#projection-head"),
    projectionBody: $("#projection-body"),
    projectionSelected: $("#projection-selected"),
    projectionEquation: $("#projection-equation"),
    projectionBreakeven: $("#projection-breakeven"),
    projectionTp: $("#projection-tp"),
    projectionSl: $("#projection-sl"),
    projectionNetR: $("#projection-net-r"),
    projectionRiskAmount: $("#projection-risk-amount"),
    projectionRiskContext: $("#projection-risk-context"),
    projectionSimpleGrowth: $("#projection-simple-growth"),
    projectionSimpleFinal: $("#projection-simple-final"),
    projectionCompoundGrowth: $("#projection-compound-growth"),
    projectionCompoundFinal: $("#projection-compound-final"),
    projectionLive: $("#projection-live"),
    projectionModeNote: $("#projection-mode-note"),
    jsonFile: $("#json-file"),
    csvFile: $("#csv-file"),
  };
  const persist = async (nextState = state) => {
    const saved = await services.save(nextState);
    if (!saved) return false;
    state = saved;
    return true;
  };
  const displayNumber = (value, maxDigits = 4) => {
    if (value === null || value === undefined || !Number.isFinite(value))
      return "—";
    const absolute = Math.abs(value);
    const digits =
      absolute > 0 && absolute < 0.01
        ? Math.min(10, Math.max(maxDigits, 8))
        : maxDigits;
    if (absolute > 0 && absolute < 10 ** -digits) {
      return formatEditableNumber(
        value
          .toExponential(5)
          .replace(/\.0+e/, "e")
          .replace(/(\.\d*?)0+e/, "$1e")
          .replace("e+", "e"),
      );
    }
    return new Intl.NumberFormat("fa-IR-u-nu-arabext", {
      maximumFractionDigits: digits,
    }).format(value);
  };
  const displayMoney = (value, currencyOverride = null) => {
    if (value === null || value === undefined || !Number.isFinite(value))
      return "—";
    const currencies = [
      ...new Set(
        state.accounts.map(
          (account) => account.currency || state.settings.currency,
        ),
      ),
    ];
    const liveCurrency =
      currencyOverride ||
      (currentView === "editor"
        ? getFormAccount()?.currency
        : activeAccountScope
          ? getAccountById(activeAccountScope)?.currency
          : currencies.length === 1
            ? currencies[0]
            : null);
    if (!liveCurrency) return "چندارزی؛ تفکیک در حساب‌ها";
    const absolute = Math.abs(value);
    const amount =
      absolute > 0 && absolute < 1e-8
        ? formatEditableNumber(
            value
              .toExponential(5)
              .replace(/\.0+e/, "e")
              .replace(/(\.\d*?)0+e/, "$1e")
              .replace("e+", "e"),
          )
        : new Intl.NumberFormat("fa-IR-u-nu-arabext", {
            minimumFractionDigits: 2,
            maximumFractionDigits: absolute < 0.01 ? 8 : 2,
          }).format(value);
    return amount + " " + liveCurrency;
  };
  const displayPrice = (value) => displayNumber(value, 8);
  const displayR = (value) =>
    value === null || value === undefined || !Number.isFinite(value)
      ? "—"
      : displayNumber(value, 2) + "R";
  const displayRR = (value) =>
    value === null || value === undefined || !Number.isFinite(value)
      ? "—"
      : "۱ : " + displayNumber(value, 2);
  const labelFor = (group, value) =>
    state.options[group]?.find((item) => item.id === value)?.label ||
    LABELS[group]?.[value] ||
    String(value || "ثبت نشده");
  const labelsFor = (trade, group, fallback = "ثبت نشده") =>
    optionTradeValues(trade, group)
      .map((value) => labelFor(group, value))
      .join("، ") || fallback;
  const getRiskBudget = () => {
    const mode =
      $("input[name='risk-mode']:checked")?.value || state.settings.riskMode;
    if (mode === "fixed") return positiveNumber(refs.fixedRisk.value);
    const balance = positiveNumber(refs.accountBalance.value);
    const percent = positiveNumber(refs.riskPercent.value);
    if (balance === null || percent === null || percent > 100) return null;
    const budget = (balance * percent) / 100;
    return Number.isFinite(budget) && budget > 0 ? budget : null;
  };
  const readDirection = () =>
    $("input[name='direction']:checked", refs.form)?.value || "long";
  const CONTEXT_DIRECTION_LABELS = Object.freeze({
    unknown: "ثبت نشده",
    bullish: "صعودی",
    bearish: "نزولی",
    neutral: "خنثی",
  });
  const TIMEFRAME_DIRECTION_FIELDS = Object.freeze({
    monthly: "ماهانه",
    weekly: "هفتگی",
    daily: "روزانه",
    h4: "۴ ساعته",
  });
  const confirmationDraftSnapshots = new Map();
  const confirmationDraftCards = new Map();
  let confirmationSelectedOrder = [];
  let confirmationCardSerial = 0;
  const confirmationDraftType = (value) =>
    ["simple", "details", "direction", "direction_details"].includes(value)
      ? value
      : "simple";
  const confirmationHasDetails = (type) =>
    type === "details" || type === "direction_details";
  const confirmationHasDirection = (type) =>
    type === "direction" || type === "direction_details";
  const confirmationDraftDirection = (value) =>
    Object.hasOwn(CONTEXT_DIRECTION_LABELS, value) ? value : "unknown";
  const readTimeframeDirectionsDraft = () =>
    Object.fromEntries(
      Object.keys(TIMEFRAME_DIRECTION_FIELDS).map((key) => [
        key,
        document.getElementById("bias-" + key)?.value || "unknown",
      ]),
    );
  const setTimeframeDirectionsDraft = (values) => {
    Object.keys(TIMEFRAME_DIRECTION_FIELDS).forEach((key) => {
      const select = document.getElementById("bias-" + key);
      if (!select) return;
      select.value = confirmationDraftDirection(values?.[key]);
      listboxControllers.get(select)?.sync();
    });
  };
  const confirmationSnapshotFor = (id) => {
    if (!confirmationDraftSnapshots.has(id)) {
      const option = state.options.confirmations.find((item) => item.id === id);
      confirmationDraftSnapshots.set(id, {
        id,
        type: confirmationDraftType(option?.type),
        details: "",
        direction: "unknown",
      });
    }
    return confirmationDraftSnapshots.get(id);
  };
  const getSelectedConfirmations = () => {
    const checked = $$(
      'input[name="confirmations"]:checked',
      refs.confirmationOptions,
    ).map((input) => input.value);
    confirmationSelectedOrder = confirmationSelectedOrder.filter((id) =>
      checked.includes(id),
    );
    checked.forEach((id) => {
      if (!confirmationSelectedOrder.includes(id))
        confirmationSelectedOrder.push(id);
    });
    return [...confirmationSelectedOrder];
  };
  const readConfirmationValuesDraft = () =>
    getSelectedConfirmations().map((id) => {
      const snapshot = confirmationSnapshotFor(id);
      const card = confirmationDraftCards.get(id);
      return {
        id,
        type: snapshot.type,
        details: card?.details.value ?? snapshot.details,
        direction: card?.direction.value ?? snapshot.direction,
      };
    });
  const setConfirmationValuesDraft = (values) => {
    globalThis.EdgeUI?.closeConfirmationPopovers?.();
    confirmationDraftSnapshots.clear();
    confirmationSelectedOrder = [];
    (Array.isArray(values) ? values : []).forEach((value) => {
      if (!value || typeof value.id !== "string") return;
      const snapshot = {
        id: value.id,
        type: confirmationDraftType(value.type),
        details: String(value.details ?? ""),
        direction: confirmationDraftDirection(value.direction),
      };
      confirmationDraftSnapshots.set(value.id, snapshot);
      if (!confirmationSelectedOrder.includes(value.id))
        confirmationSelectedOrder.push(value.id);
    });
    confirmationDraftCards.forEach((card) => {
      const snapshot = confirmationDraftSnapshots.get(card.input.value);
      card.details.value = snapshot?.details || "";
      card.direction.value = snapshot?.direction || "unknown";
      listboxControllers.get(card.direction)?.sync();
    });
  };
  const renameConfirmationDraftId = (oldId, newId) => {
    if (oldId === newId) return;
    const snapshot = confirmationDraftSnapshots.get(oldId);
    if (snapshot) {
      confirmationDraftSnapshots.delete(oldId);
      snapshot.id = newId;
      confirmationDraftSnapshots.set(newId, snapshot);
    }
    const card = confirmationDraftCards.get(oldId);
    if (card) {
      confirmationDraftCards.delete(oldId);
      card.input.value = newId;
      confirmationDraftCards.set(newId, card);
    }
    confirmationSelectedOrder = confirmationSelectedOrder.map((id) =>
      id === oldId ? newId : id,
    );
  };
  const pruneConfirmationDraftId = (id) => {
    confirmationDraftSnapshots.delete(id);
    confirmationSelectedOrder = confirmationSelectedOrder.filter(
      (value) => value !== id,
    );
    const card = confirmationDraftCards.get(id);
    if (card) {
      card.popover?.destroy();
      listboxControllers.get(card.direction)?.destroy?.();
      listboxControllers.delete(card.direction);
      card.root.remove();
      confirmationDraftCards.delete(id);
    }
  };
  const mountConfirmationDirection = (card) => {
    if (!listboxControllers.has(card.direction))
      listboxControllers.set(
        card.direction,
        createListboxController(card.direction),
      );
    else listboxControllers.get(card.direction).sync();
  };
  const ensureConfirmationPopover = (card) => {
    if (!card.popover)
      card.popover = globalThis.EdgeUI.mountConfirmationPopover(card, {
        formId: refs.form.id,
        beforeOpen: () => {
          if (openListboxController) closeListbox(openListboxController, false);
          if (openDateController)
            closePersianCalendar(openDateController, false);
        },
        onClose: () => {
          const controller = listboxControllers.get(card.direction);
          if (!controller?.isOpen) return;
          const focused = document.activeElement;
          closeListbox(controller, false);
          if (
            focused instanceof HTMLElement &&
            focused.isConnected &&
            !focused.closest("[hidden]")
          )
            focused.focus({
              preventScroll: true,
            });
        },
      });
    return card.popover;
  };
  const revealConfirmationField = (control) => {
    const card = [...confirmationDraftCards.values()].find(
      (item) => item.details === control || item.direction === control,
    );
    if (!card) return false;
    openAccordionFor(card.input);
    card.root.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
    ensureConfirmationPopover(card).setOpen(true);
    return true;
  };
  const syncConfirmationDraftCard = (card, item, selected) => {
    const snapshot =
      selected || confirmationDraftSnapshots.has(item.id)
        ? confirmationSnapshotFor(item.id)
        : {
            type: confirmationDraftType(item.type),
            details: "",
            direction: "unknown",
          };
    card.input.checked = selected;
    card.name.textContent = item.label + (item.active ? "" : " (بایگانی‌شده)");
    card.description.textContent = item.description || "";
    card.description.hidden = !item.description;
    card.root.classList.toggle("is-archived", !item.active);
    card.root.classList.toggle("is-selected", selected);
    card.type.textContent =
      snapshot.type === "direction_details"
        ? "دارای جهت و جزئیات"
        : snapshot.type === "details"
          ? "با جزئیات"
          : snapshot.type === "direction"
            ? "جهت‌دار"
            : "ساده";
    card.detailsField.hidden =
      !selected || !confirmationHasDetails(snapshot.type);
    card.directionField.hidden =
      !selected || !confirmationHasDirection(snapshot.type);
    card.details.disabled = !selected || !confirmationHasDetails(snapshot.type);
    card.direction.disabled =
      !selected || !confirmationHasDirection(snapshot.type);
    card.history.hidden =
      !selected || confirmationDraftType(item.type) === snapshot.type;
    card.typeUpdate.disabled = !selected;
    card.typeUpdate.setAttribute(
      "aria-label",
      "اعمال نوع تنظیم‌شده بر این پوزیشن برای " + item.label,
    );
    const retained = [];
    if (!confirmationHasDetails(snapshot.type) && snapshot.details)
      retained.push("یادداشت ثبت‌شده: " + snapshot.details);
    if (
      !confirmationHasDirection(snapshot.type) &&
      snapshot.direction !== "unknown"
    )
      retained.push(
        "جهت ثبت‌شده: " + CONTEXT_DIRECTION_LABELS[snapshot.direction],
      );
    card.retained.textContent = retained.join(" · ");
    card.retained.hidden = !selected || !retained.length;
    if (
      document.activeElement !== card.details &&
      card.details.value !== snapshot.details
    )
      card.details.value = snapshot.details;
    if (card.direction.value !== snapshot.direction)
      card.direction.value = snapshot.direction;
    if (selected && confirmationHasDirection(snapshot.type))
      mountConfirmationDirection(card);
    else listboxControllers.get(card.direction)?.sync();
    const hasExtraFields =
      confirmationHasDetails(snapshot.type) ||
      confirmationHasDirection(snapshot.type);
    const canOpen =
      selected &&
      (hasExtraFields || !card.history.hidden || !card.retained.hidden);
    const showChevron = hasExtraFields || canOpen;
    card.root.classList.toggle("has-confirmation-popover", showChevron);
    if (showChevron) ensureConfirmationPopover(card);
    card.popover?.sync({
      label: item.label,
      visible: showChevron,
      enabled: canOpen,
    });
  };
  const createConfirmationDraftCard = (item) => {
    const root = document.createElement("div");
    root.className = "confirmation-draft-card";
    const label = document.createElement("label");
    label.className = "confirmation-option";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "confirmations";
    input.value = item.id;
    const serial = ++confirmationCardSerial;
    input.id = "confirmation-choice-" + serial;
    label.htmlFor = input.id;
    const copy = document.createElement("span");
    copy.className = "confirmation-choice-copy";
    const name = document.createElement("span");
    name.className = "confirmation-choice-name";
    const type = document.createElement("small");
    type.className = "confirmation-type-label";
    const description = document.createElement("small");
    description.className = "option-description";
    copy.append(name, type, description);
    label.append(input, copy);
    root.append(label);
    const history = document.createElement("p");
    history.className = "confirmation-snapshot-note";
    history.textContent = "نوع ثبت‌شدهٔ این تأییدیه برای پوزیشن حفظ شده است.";
    history.hidden = true;
    root.append(history);
    const typeUpdate = document.createElement("button");
    typeUpdate.type = "button";
    typeUpdate.className = "button ghost small confirmation-adopt-type";
    typeUpdate.textContent = "اعمال نوع تنظیم‌شده بر این پوزیشن";
    history.appendChild(typeUpdate);
    const retained = document.createElement("p");
    retained.className = "confirmation-snapshot-note";
    retained.dir = "auto";
    retained.hidden = true;
    root.append(retained);
    const detailsField = document.createElement("div");
    detailsField.className = "field confirmation-value-field";
    detailsField.hidden = true;
    const detailsLabel = document.createElement("label");
    const details = document.createElement("textarea");
    details.id = "confirmation-details-" + serial;
    details.name = "confirmationDetails";
    details.maxLength = 1000;
    details.rows = 3;
    details.dir = "auto";
    details.placeholder = "جزئیات این تأییدیه در همین پوزیشن…";
    details.disabled = true;
    detailsLabel.className = "sr-only";
    detailsLabel.htmlFor = details.id;
    detailsLabel.textContent = "جزئیات " + item.label;
    const detailsHelp = document.createElement("small");
    detailsHelp.id = details.id + "-help";
    detailsHelp.textContent = "حداکثر ۱۰۰۰ نویسه";
    details.setAttribute("aria-describedby", detailsHelp.id);
    detailsField.append(detailsLabel, details, detailsHelp);
    root.append(detailsField);
    const directionField = document.createElement("div");
    directionField.className = "field confirmation-value-field";
    directionField.hidden = true;
    const directionLabel = document.createElement("label");
    const direction = document.createElement("select");
    direction.id = "confirmation-direction-" + serial;
    direction.name = "confirmationDirection";
    direction.disabled = true;
    directionLabel.className = "sr-only";
    directionLabel.htmlFor = direction.id;
    directionLabel.textContent = "جهت " + item.label;
    Object.entries(CONTEXT_DIRECTION_LABELS).forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      direction.appendChild(option);
    });
    directionField.append(directionLabel, direction);
    root.append(directionField);
    const card = {
      root,
      input,
      name,
      type,
      description,
      history,
      typeUpdate,
      retained,
      detailsField,
      detailsLabel,
      details,
      directionField,
      directionLabel,
      direction,
    };
    input.addEventListener("change", () => {
      if (
        input.checked &&
        $$('input[name="confirmations"]:checked', refs.confirmationOptions)
          .length > 25
      ) {
        input.checked = false;
        showToast("برای هر معامله حداکثر ۲۵ تأییدیه انتخاب کن.", true);
        return;
      }
      if (input.checked) {
        confirmationSnapshotFor(input.value);
        if (!confirmationSelectedOrder.includes(input.value))
          confirmationSelectedOrder.push(input.value);
      } else
        confirmationSelectedOrder = confirmationSelectedOrder.filter(
          (id) => id !== input.value,
        );
      const option = state.options.confirmations.find(
        (value) => value.id === input.value,
      );
      if (option) syncConfirmationDraftCard(card, option, input.checked);
      if (input.checked) card.popover?.setOpen(true);
    });
    details.addEventListener("input", () => {
      confirmationSnapshotFor(input.value).details = details.value;
    });
    direction.addEventListener("change", () => {
      confirmationSnapshotFor(input.value).direction = direction.value;
    });
    typeUpdate.addEventListener("click", () => {
      if (!input.checked) return;
      const option = state.options.confirmations.find(
        (value) => value.id === input.value,
      );
      if (!option) return;
      const snapshot = confirmationSnapshotFor(input.value);
      snapshot.details = details.value;
      snapshot.direction = direction.value;
      snapshot.type = confirmationDraftType(option.type);
      syncConfirmationDraftCard(card, option, true);
      root.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
    });
    return card;
  };
  const renderConfirmationOptions = (selected = []) => {
    const selectedSet = new Set(selected);
    confirmationSelectedOrder = [...new Set(selected)];
    const catalogIds = new Set(
      state.options.confirmations.map((item) => item.id),
    );
    confirmationDraftCards.forEach((card, id) => {
      if (!catalogIds.has(id)) pruneConfirmationDraftId(id);
    });
    const visible = state.options.confirmations.filter(
      (item) => item.active || selectedSet.has(item.id),
    );
    const visibleIds = new Set(visible.map((item) => item.id));
    confirmationDraftCards.forEach((card, id) => {
      if (!visibleIds.has(id)) {
        card.root.hidden = true;
        card.input.checked = false;
        card.details.disabled = true;
        card.direction.disabled = true;
        card.popover?.sync({
          enabled: false,
        });
        listboxControllers.get(card.direction)?.sync();
      }
    });
    visible.forEach((item) => {
      let card = confirmationDraftCards.get(item.id);
      if (!card) {
        card = createConfirmationDraftCard(item);
        confirmationDraftCards.set(item.id, card);
        refs.confirmationOptions.appendChild(card.root);
      }
      card.root.hidden = false;
      card.detailsLabel.textContent = "جزئیات " + item.label;
      card.directionLabel.textContent = "جهت " + item.label;
      syncConfirmationDraftCard(card, item, selectedSet.has(item.id));
    });
  };
  const markContextFieldErrors = (errors) => {
    const targets = [];
    const mark = (control, message) => {
      if (!control || control.disabled) return;
      if (!revealConfirmationField(control)) openAccordionFor(control);
      const visible = visibleControlFor(control);
      control.setAttribute("aria-invalid", "true");
      visible.setAttribute("aria-invalid", "true");
      const field = control.closest(".field") || control.parentElement;
      let inline = field.querySelector(".field-error");
      if (!inline) {
        inline = document.createElement("small");
        inline.className = "field-error";
        inline.id = control.id + "-error";
        field.appendChild(inline);
      }
      inline.textContent = message;
      visible.setAttribute("aria-describedby", inline.id);
      if (!targets.includes(visible)) targets.push(visible);
    };
    errors.forEach((error) => {
      if (error.includes("تایم‌فریم")) {
        const matched = Object.entries(TIMEFRAME_DIRECTION_FIELDS).filter(
          ([key, label]) =>
            error.includes(label) || (key === "h4" && error.includes("۴ ساعت")),
        );
        (matched.length
          ? matched
          : Object.entries(TIMEFRAME_DIRECTION_FIELDS)
        ).forEach(([key]) =>
          mark(document.getElementById("bias-" + key), error),
        );
      }
      if (!error.includes("تأییدیه")) return;
      getSelectedConfirmations().forEach((id) => {
        const card = confirmationDraftCards.get(id);
        const snapshot = confirmationSnapshotFor(id);
        if (!card) return;
        const namedId = error.includes(": ")
          ? error.slice(error.lastIndexOf(": ") + 2)
          : "";
        if (namedId && namedId !== id) return;
        if (
          confirmationHasDetails(snapshot.type) &&
          (error.includes("جزئیات") || error.includes("نویسه"))
        )
          mark(card.details, error);
        if (confirmationHasDirection(snapshot.type) && error.includes("جهت"))
          mark(card.direction, error);
      });
    });
    return targets;
  };
  const multiPickerControllers = new Map();
  const getSelectedManaged = (group) => {
    const controller = multiPickerControllers.get(group);
    if (!controller) return refs[group]?.value ? [refs[group].value] : [];
    const checked = $$(
      'input[type="checkbox"]:checked',
      controller.options,
    ).map((input) => input.value);
    const ordered = (controller.selectedOrder || []).filter((value) =>
      checked.includes(value),
    );
    checked.forEach((value) => {
      if (!ordered.includes(value)) ordered.push(value);
    });
    controller.selectedOrder = ordered;
    return [...ordered];
  };
  const withManagedTradeValues = (trade, group, values) => {
    if (group === "confirmations")
      return {
        ...trade,
        confirmations: [...new Set(values)],
      };
    const plural = MULTI_OPTION_FIELDS[group];
    if (!plural)
      return {
        ...trade,
        [group]: values[0] || OPTION_GROUPS[group].fallback,
      };
    const normalized = normalizeOptionValues(group, values, state.options);
    return {
      ...trade,
      [plural]: normalized,
      [group]: normalized[0] || OPTION_GROUPS[group].fallback || "",
    };
  };
  const renderManagedMultiPicker = (group, selected = []) => {
    let controller = multiPickerControllers.get(group);
    const config = OPTION_GROUPS[group];
    const backing = refs[group];
    const field = backing.closest(".field");
    if (!controller) {
      backing.hidden = true;
      backing.dataset.multiBacking = group;
      backing.tabIndex = -1;
      backing.setAttribute("aria-hidden", "true");
      const heading = $('label[for="' + backing.id + '"]', field);
      if (heading) {
        heading.id = backing.id + "-multi-label";
        heading.removeAttribute("for");
      }
      const root = makeElement("details", "multi-picker");
      root.id = "multi-" + group;
      const summary = document.createElement("summary");
      if (heading)
        summary.setAttribute(
          "aria-labelledby",
          heading.id + " " + root.id + "-summary",
        );
      const summaryText = document.createElement("span");
      summaryText.id = root.id + "-summary";
      summary.appendChild(summaryText);
      const body = makeElement("div", "multi-picker-body");
      const search = document.createElement("input");
      search.type = "search";
      search.className = "multi-picker-search";
      search.placeholder = "جست‌وجو در نام و توضیح…";
      search.setAttribute("aria-label", "جست‌وجوی گزینه‌ها: " + config.title);
      const options = makeElement("div", "multi-picker-options");
      options.setAttribute("role", "group");
      options.setAttribute("aria-label", config.title + " — انتخاب چند گزینه");
      const empty = makeElement(
        "p",
        "multi-picker-empty",
        "گزینه‌ای پیدا نشد.",
      );
      empty.hidden = true;
      const filter = () => {
        const term = optionNameKey(search.value);
        let visible = 0;
        $$(".multi-option", options).forEach((label) => {
          label.hidden = Boolean(term && !label.dataset.search.includes(term));
          if (!label.hidden) visible += 1;
        });
        empty.hidden = Boolean(visible);
      };
      search.addEventListener("input", filter);
      body.append(search, options, empty);
      root.append(summary, body);
      backing.after(root);
      const help = makeElement(
        "p",
        "multi-picker-help",
        "می‌توانی چند گزینه انتخاب کنی؛ هر انتخاب در تحلیل خودش حساب می‌شود.",
      );
      root.after(help);
      controller = {
        root,
        summary,
        summaryText,
        search,
        options,
        empty,
        filter,
      };
      multiPickerControllers.set(group, controller);
      options.addEventListener("change", (event) => {
        const input = event.target;
        if (!input.matches('input[type="checkbox"]')) return;
        let next = getSelectedManaged(group);
        if (input.checked && input.value === config.fallback)
          next = [config.fallback];
        else if (input.checked)
          next = next.filter((value) => value !== config.fallback);
        if (!next.length && config.fallback) next = [config.fallback];
        if (input.checked && next.length > 25) {
          input.checked = false;
          showToast(
            "برای هر دسته حداکثر ۲۵ گزینه انتخاب کن؛ انتخاب‌های قبلی حفظ شدند.",
            true,
          );
          syncManagedPickerSummary(group);
          return;
        }
        const normalized = normalizeOptionValues(group, next, state.options);
        $$('input[type="checkbox"]', options).forEach(
          (check) => (check.checked = normalized.includes(check.value)),
        );
        syncManagedPickerSummary(group);
      });
    }
    const normalized = normalizeOptionValues(group, selected, state.options);
    const selectedSet = new Set(normalized);
    controller.selectedOrder = [...normalized];
    controller.options.replaceChildren();
    state.options[group]
      .filter((item) => item.active || selectedSet.has(item.id))
      .forEach((item, index) => {
        const label = makeElement(
          "label",
          "multi-option" + (item.active ? "" : " is-archived"),
        );
        label.dataset.search = optionNameKey(
          item.label + " " + (item.description || ""),
        );
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = MULTI_OPTION_FIELDS[group];
        input.value = item.id;
        input.checked = selectedSet.has(item.id);
        const copy = makeElement("span", "multi-option-copy");
        copy.appendChild(
          makeElement(
            "span",
            "",
            item.label + (item.active ? "" : " (حذف‌شده از فهرست)"),
          ),
        );
        if (item.description) {
          const description = makeElement(
            "small",
            "option-description",
            item.description,
          );
          description.id = "multi-" + group + "-description-" + index;
          input.setAttribute("aria-describedby", description.id);
          copy.appendChild(description);
        }
        label.append(input, copy);
        controller.options.appendChild(label);
      });
    controller.filter();
    syncManagedPickerSummary(group);
    globalThis.EdgeUI.mountMultiPicker(controller, {
      title: config.title,
      fallback: config.fallback,
      labelId: backing.id + "-multi-label",
    });
  };
  const syncManagedPickerSummary = (group) => {
    const controller = multiPickerControllers.get(group);
    if (!controller) return;
    const selected = getSelectedManaged(group);
    refs[group].value = selected[0] || OPTION_GROUPS[group].fallback || "";
    const real = selected.filter(
      (value) => value !== OPTION_GROUPS[group].fallback,
    );
    const labels = real.map(
      (id) => state.options[group].find((item) => item.id === id)?.label || id,
    );
    controller.summaryText.textContent = labels.length
      ? displayNumber(labels.length) + " انتخاب · " + labels.join("، ")
      : OPTION_GROUPS[group].fallback
        ? labelFor(group, OPTION_GROUPS[group].fallback) + " · انتخاب گزینه‌ها"
        : "انتخاب یک یا چند ستاپ";
    globalThis.EdgeUI.syncMultiPicker(controller);
  };
  const syncSingleManagedDescription = (group) => {
    const select = refs[group];
    const id = select.id + "-option-description";
    let help = document.getElementById(id);
    if (!help) {
      help = makeElement("p", "option-description");
      help.id = id;
      select.closest(".field").appendChild(help);
      select.addEventListener("change", () =>
        syncSingleManagedDescription(group),
      );
    }
    help.textContent =
      state.options[group].find((item) => item.id === select.value)
        ?.description || "";
    help.hidden = !help.textContent;
    const described = new Set(
      (select.getAttribute("aria-describedby") || "")
        .split(/\s+/)
        .filter(Boolean),
    );
    described.add(id);
    select.setAttribute("aria-describedby", [...described].join(" "));
    listboxControllers
      .get(select)
      ?.button.setAttribute("aria-describedby", [...described].join(" "));
  };
  const factorDefinitions = [
    ["marketType", "بازار"],
    ["strategy", "استراتژی / ستاپ"],
    ["timeframe", "تایم‌فریم"],
    ["emotion", "حالت ذهنی"],
    ["planFollowed", "پایبندی به پلن"],
    ["mistakeType", "اشتباه اصلی"],
    ["setupQuality", "کیفیت ستاپ"],
    ["confidence", "اعتماد به ستاپ"],
    ["maxTouchedR", "بیشترین R لمس‌شده"],
    ["weekday", "روز هفته"],
    ["weekpart", "روزکاری / آخرهفته"],
    ["timebucket", "بازهٔ ساعت ورود"],
  ];
  const factorValues = (trade, key) => {
    if (key === "maxTouchedR") return [maxTouchedRBucket(trade)];
    if (key === "weekday") return [weekdayKey(trade.openDate)];
    if (key === "weekpart") return [classifyWeekpart(trade.openDate)];
    if (key === "timebucket") return [timeBucketKey(trade.openTime)];
    if (Object.hasOwn(MULTI_OPTION_FIELDS, key)) {
      const values = optionTradeValues(trade, key);
      return values.length
        ? [...new Set(values)]
        : [OPTION_GROUPS[key]?.fallback || "unknown"];
    }
    return [
      trade[key] === null || trade[key] === undefined || trade[key] === ""
        ? "unknown"
        : String(trade[key]),
    ];
  };
  const factorValue = (trade, key) => factorValues(trade, key)[0];
  const matchesFactorValue = (trade, key, value) =>
    factorValues(trade, key).includes(value);
  const matchesTradeSearch = (trade, search) =>
    !search ||
    [
      trade.symbol,
      ...optionTradeValues(trade, "strategy").map((value) =>
        labelFor("strategy", value),
      ),
    ].some((value) =>
      String(value || "")
        .toUpperCase()
        .includes(search),
    );
  const factorLabel = (key, value) => {
    if (key === "maxTouchedR")
      return (
        MAX_TOUCHED_R_BUCKETS.find(([bucket]) => bucket === value)?.[1] ||
        "ثبت نشده / ریسک نامعتبر"
      );
    if (key === "weekday")
      return value === "unknown" ? "ثبت نشده" : WEEKDAY_LABELS[Number(value)];
    if (key === "strategy")
      return value === "unknown" ? "ثبت نشده" : labelFor(key, value);
    if (key === "confidence")
      return value === "unknown"
        ? "ثبت نشده"
        : "امتیاز " + displayNumber(Number(value));
    return labelFor(key, value);
  };
  const readFactorFilters = () =>
    Object.fromEntries(
      factorDefinitions.flatMap(([key]) => {
        const value = $("#factor-" + key).value;
        return value === "" ? [] : [[key, JSON.parse(value)]];
      }),
    );
  const matchesConfirmationFilter = (trade, selected, mode = "all") => {
    const values = trade.confirmations || [];
    if (mode === "empty") return values.length === 0;
    if (!selected.length) return true;
    if (mode === "any") return selected.some((value) => values.includes(value));
    if (mode === "none")
      return selected.every((value) => !values.includes(value));
    return selected.every((value) => values.includes(value));
  };
  const refreshConfirmationFilter = () => {
    const values = [
      ...new Set([
        ...state.options.confirmations
          .filter((item) => item.active)
          .map((item) => item.id),
        ...state.trades.flatMap((trade) => trade.confirmations || []),
        ...selectedFactorConfirmations,
      ]),
    ].sort((a, b) => a.localeCompare(b, "fa"));
    const container = $("#filter-confirmation-options");
    const signature = JSON.stringify(values);
    if (container.dataset.signature !== signature) {
      container.replaceChildren();
      values.forEach((value) => {
        const label = makeElement("label", "confirmation-option");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.name = "factorConfirmations";
        input.value = value;
        label.append(input, makeElement("span", "", value));
        container.appendChild(label);
      });
      container.dataset.signature = signature;
    }
    $$('input[name="factorConfirmations"]', container).forEach((input) => {
      input.checked = selectedFactorConfirmations.has(input.value);
      input.disabled = refs.filterConfirmationMode.value === "empty";
    });
  };
  let factorOptionsRevision = -1;
  const refreshFactorFilters = () => {
    if (factorOptionsRevision === services.state.revision) return;
    factorOptionsRevision = services.state.revision;
    factorDefinitions.forEach(([key]) => {
      const select = $("#factor-" + key);
      const current = select.value;
      const catalogValues = (state.options[key] || [])
        .filter((item) => item.active)
        .map((item) => String(item.id));
      const values =
        key === "maxTouchedR"
          ? MAX_TOUCHED_R_BUCKETS.map(([bucket]) => bucket)
          : [
              ...new Set([
                ...catalogValues,
                ...state.trades.flatMap((trade) => factorValues(trade, key)),
                ...(current ? [JSON.parse(current)] : []),
              ]),
            ].sort((a, b) =>
              factorLabel(key, a).localeCompare(factorLabel(key, b), "fa"),
            );
      const signature = JSON.stringify(
        values.map((value) => [value, factorLabel(key, value)]),
      );
      if (select.dataset.signature === signature) return;
      select.replaceChildren(
        new Option("همه", ""),
        ...values.map(
          (value) => new Option(factorLabel(key, value), JSON.stringify(value)),
        ),
      );
      select.value = current;
      select.dataset.signature = signature;
      listboxControllers.get(select)?.refresh();
    });
  };
  const hasActiveFactorFilters = () =>
    Boolean(
      $("#filter-touched-r-min").value !== "" ||
      refs.filterSymbol.value ||
      refs.filterDirection.value !== "all" ||
      refs.filterStatus.value !== "all" ||
      refs.filterSession.value !== "all" ||
      selectedFactorConfirmations.size ||
      refs.filterConfirmationMode.value === "empty" ||
      Object.keys(readFactorFilters()).length ||
      refs.filterFrom.value ||
      refs.filterTo.value,
    );
  let activeOptionGroup = "confirmations";
  let catalogReturnHash = "#settings";
  const optionDialog = $("#option-manager");
  const setOptionStatus = (message, error = false) => {
    $("#option-manager-status").textContent = message;
    $("#option-manager-status").classList.toggle("error", error);
  };
  const optionUsage = (group, id) =>
    state.trades.filter((trade) => optionTradeValues(trade, group).includes(id))
      .length;
  const optionDuplicate = (group, label, exceptId = null) =>
    state.options[group].some(
      (item) =>
        item.id !== exceptId &&
        optionNameKey(item.label) === optionNameKey(label),
    );
  const optionButton = (text, action, className = "") => {
    const button = makeElement("button", "button ghost " + className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
  };
  const refreshManagedOptions = (values = {}) => {
    const selectedByGroup = Object.fromEntries(
      Object.keys(MULTI_OPTION_FIELDS).map((group) => [
        group,
        Object.hasOwn(values, MULTI_OPTION_FIELDS[group]) ||
        Object.hasOwn(values, group)
          ? optionTradeValues(values, group)
          : getSelectedManaged(group),
      ]),
    );
    Object.entries(OPTION_GROUPS).forEach(([group, config]) => {
      if (!config.select) return;
      const select = refs[group];
      const selected = MULTI_OPTION_FIELDS[group] ? selectedByGroup[group] : [];
      const current = MULTI_OPTION_FIELDS[group]
        ? selected[0] || config.fallback
        : Object.hasOwn(values, group)
          ? values[group]
          : select.value;
      select.replaceChildren();
      state.options[group]
        .filter(
          (item) =>
            item.active || item.id === current || selected.includes(item.id),
        )
        .forEach((item) => {
          const option = new Option(
            item.label + (item.active ? "" : " (حذف‌شده از فهرست)"),
            item.id,
          );
          if (item.description) option.title = item.description;
          select.add(option);
        });
      select.value = state.options[group].some((item) => item.id === current)
        ? current
        : config.fallback;
      listboxControllers.get(select)?.refresh();
      if (!MULTI_OPTION_FIELDS[group]) syncSingleManagedDescription(group);
    });
    Object.keys(MULTI_OPTION_FIELDS).forEach((group) =>
      renderManagedMultiPicker(group, selectedByGroup[group]),
    );
    const sessionFilter = refs.filterSession.value || "all";
    refs.filterSession.replaceChildren(new Option("همهٔ سشن‌ها", "all"));
    state.options.session
      .filter((item) => item.active || optionUsage("session", item.id))
      .forEach((item) => {
        refs.filterSession.add(
          new Option(item.label + (item.active ? "" : " (حذف‌شده)"), item.id),
        );
      });
    refs.filterSession.value = [...refs.filterSession.options].some(
      (item) => item.value === sessionFilter,
    )
      ? sessionFilter
      : "all";
    listboxControllers.get(refs.filterSession)?.refresh();
    $("#strategy-suggestions").replaceChildren(
      ...state.options.strategy
        .filter((item) => item.active)
        .map((item) => new Option(item.label, item.id)),
    );
  };
  const commitOptionChanges = async ({
    options,
    trades = state.trades,
    selected = getSelectedConfirmations(),
    values = {},
    renamedConfirmation = null,
    removedConfirmation = null,
  }) => {
    if (
      !(await persist({
        ...state,
        options,
        trades,
      }))
    ) {
      setOptionStatus(
        "ذخیره ممکن نشد؛ هیچ تغییری اعمال نشد. دوباره تلاش کن.",
        true,
      );
      return false;
    }
    // Draft metadata is changed only after the catalog/trade transaction commits.
    if (
      renamedConfirmation &&
      renamedConfirmation[0] !== renamedConfirmation[1]
    ) {
      if (selectedFactorConfirmations.delete(renamedConfirmation[0]))
        selectedFactorConfirmations.add(renamedConfirmation[1]);
      if (typeof renameConfirmationDraftId === "function")
        renameConfirmationDraftId(...renamedConfirmation);
    }
    if (removedConfirmation !== null) {
      selectedFactorConfirmations.delete(removedConfirmation);
      if (typeof pruneConfirmationDraftId === "function")
        pruneConfirmationDraftId(removedConfirmation);
    }
    refreshManagedOptions(values);
    renderConfirmationOptions(selected);
    renderAll();
    renderOptionManager();
    return true;
  };
  const recoverOptionCatalog = async (file) => {
    const button = $("#recover-option-catalog");
    button.disabled = true;
    setOptionStatus("در حال بررسی گزینه‌های پشتیبان…");
    try {
      const payload = await services.parseJSONFile(file);
      const result = mergeCatalogRecovery(state.options, payload);
      const conflictNote = result.counts.conflicts
        ? " · " +
          displayNumber(result.counts.conflicts) +
          " نام متعارض با حفظ گزینهٔ فعلی"
        : "";
      if (!result.changed) {
        setOptionStatus(
          "گزینهٔ تازه‌ای برای بازیابی پیدا نشد؛ گزینه‌های موجود حفظ شدند." +
            conflictNote,
        );
        return;
      }
      const backup = {
        version: VERSION,
        catalogOnly: true,
        dataMode: IS_DEMO ? "demo" : "live",
        exportedAt: nowIso(),
        options: state.options,
        trades: [],
      };
      download(
        "edge-journal-catalog-before-recovery-" +
          nowIso().replace(/[:.]/g, "-") +
          ".json",
        JSON.stringify(backup, null, 2),
        "application/json",
      );
      if (
        !(await commitOptionChanges({
          options: result.options,
        }))
      )
        return;
      if (result.counts.archivedAdded) {
        $("#option-show-archived").checked = true;
        renderOptionManager();
      }
      const details = Object.entries(result.counts.groups)
        .filter(([, counts]) => counts.added || counts.updated)
        .map(
          ([group, counts]) =>
            OPTION_GROUPS[group].title +
            ": " +
            displayNumber(counts.added) +
            " افزوده، " +
            displayNumber(counts.updated) +
            " به‌روز",
        )
        .join("؛ ");
      const message =
        "بازیابی شد: " +
        displayNumber(result.counts.added) +
        " گزینه افزوده و " +
        displayNumber(result.counts.updated) +
        " گزینه به‌روز شد. " +
        details +
        conflictNote +
        " · پشتیبان گزینه‌های قبلی برای دانلود ساخته شد.";
      setOptionStatus(message);
      showToast(
        "بازیابی گزینه‌ها انجام شد؛ " +
          displayNumber(result.counts.added) +
          " افزوده و " +
          displayNumber(result.counts.updated) +
          " به‌روز شد.",
      );
    } catch (error) {
      setOptionStatus(
        "بازیابی ناموفق بود؛ هیچ تغییری اعمال نشد. " + error.message,
        true,
      );
      showToast("بازیابی گزینه‌ها ناموفق بود: " + error.message, true);
    } finally {
      $("#catalog-recovery-file").value = "";
      button.disabled = false;
    }
  };
  const confirmationCatalogTypeLabel = (type) =>
    ({
      simple: "تأییدیهٔ ساده",
      details: "با جزئیات",
      direction: "دارای جهت",
      direction_details: "دارای جهت و جزئیات",
    })[type] || "تأییدیهٔ ساده";
  const addManagedOption = async (
    group,
    rawLabel,
    selectConfirmation = false,
    rawDescription = "",
    rawType = "simple",
  ) => {
    const config = OPTION_GROUPS[group];
    const label = clampText(rawLabel, config.max || 50);
    if (!label || optionDuplicate(group, label)) {
      const message = !label
        ? "نام گزینه را وارد کن."
        : "این نام از قبل وجود دارد؛ گزینه‌های حذف‌شده از فهرست را هم بررسی کن.";
      setOptionStatus(message, true);
      showToast(message, true);
      return false;
    }
    let type;
    try {
      if (group === "confirmations") type = normalizeConfirmationType(rawType);
    } catch (error) {
      setOptionStatus(error.message, true);
      return false;
    }
    const item = {
      id: config.text ? label : "custom-" + makeId(),
      label,
      description: clampText(rawDescription, 1000),
      active: true,
      ...(group === "confirmations"
        ? {
            type,
          }
        : {}),
    };
    const options = {
      ...state.options,
      [group]: [...state.options[group], item],
    };
    const selected = getSelectedConfirmations();
    if (group === "confirmations" && selectConfirmation && selected.length < 25)
      selected.push(label);
    if (
      !(await commitOptionChanges({
        options,
        selected,
      }))
    )
      return false;
    setOptionStatus("گزینه اضافه و ذخیره شد.");
    showToast("گزینه اضافه و ذخیره شد.");
    return true;
  };
  const renameManagedOption = async (
    group,
    id,
    rawLabel,
    rawDescription,
    rawType,
  ) => {
    const config = OPTION_GROUPS[group];
    const label = clampText(rawLabel, config.max || 50);
    const item = state.options[group].find((entry) => entry.id === id);
    if (!item) return false;
    const description =
      rawDescription === undefined
        ? item.description || ""
        : clampText(rawDescription, 1000);
    let type;
    try {
      if (group === "confirmations")
        type = normalizeConfirmationType(rawType, item.type || "simple");
    } catch (error) {
      setOptionStatus(error.message, true);
      return false;
    }
    if (!label || optionDuplicate(group, label, id)) {
      setOptionStatus(
        !label
          ? "نام گزینه نمی‌تواند خالی باشد."
          : "این نام از قبل وجود دارد؛ نام دیگری انتخاب کن.",
        true,
      );
      return false;
    }
    const typeChanged =
      group === "confirmations" && type !== (item.type || "simple");
    if (
      label === item.label &&
      description === (item.description || "") &&
      !typeChanged
    ) {
      setOptionStatus("نام، توضیح و نوع گزینه تغییری نکرده است.");
      return false;
    }
    const newId = config.text ? label : id;
    const options = {
      ...state.options,
      [group]: state.options[group].map((entry) =>
        entry.id === id
          ? {
              ...entry,
              id: newId,
              label,
              description,
              ...(group === "confirmations"
                ? {
                    type,
                  }
                : {}),
            }
          : entry,
      ),
    };
    const trades = state.trades.map((trade) => {
      if (
        !config.text ||
        newId === id ||
        !optionTradeValues(trade, group).includes(id)
      )
        return trade;
      const selectedValues = optionTradeValues(trade, group).map((value) =>
        value === id ? newId : value,
      );
      // Confirmation type and detail/direction values are snapshots of each position.
      return group === "confirmations"
        ? {
            ...trade,
            confirmations: selectedValues,
            ...(Array.isArray(trade.confirmationValues)
              ? {
                  confirmationValues: trade.confirmationValues.map((value) =>
                    value && value.id === id
                      ? {
                          ...value,
                          id: newId,
                        }
                      : value,
                  ),
                }
              : {}),
            updatedAt: nowIso(),
          }
        : {
            ...trade,
            [MULTI_OPTION_FIELDS[group]]: selectedValues,
            [group]: selectedValues[0] || config.fallback || "",
            updatedAt: nowIso(),
          };
    });
    const selected =
      group === "confirmations"
        ? getSelectedConfirmations().map((value) =>
            value === id ? newId : value,
          )
        : getSelectedConfirmations();
    const activeFactorFilter = $("#factor-" + group);
    const factorWasSelected =
      activeFactorFilter && activeFactorFilter.value === JSON.stringify(id);
    const values = MULTI_OPTION_FIELDS[group]
      ? {
          [MULTI_OPTION_FIELDS[group]]: getSelectedManaged(group).map(
            (value) => (value === id ? newId : value),
          ),
        }
      : {};
    if (
      !(await commitOptionChanges({
        options,
        trades,
        selected,
        values,
        renamedConfirmation: group === "confirmations" ? [id, newId] : null,
      }))
    )
      return false;
    if (factorWasSelected && newId !== id) {
      activeFactorFilter.value = JSON.stringify(newId);
      syncAllListboxes();
      renderAll();
    }
    setOptionStatus(
      "نام و توضیح ذخیره شد؛ انتخاب‌ها و سابقهٔ معاملات حفظ شدند." +
        (typeChanged
          ? " نوع تازه برای انتخاب‌های جدید است؛ نوع و جزئیات انتخاب‌های قبلی حفظ شدند."
          : ""),
    );
    return true;
  };
  const toggleManagedOption = async (group, id) => {
    const item = state.options[group].find((entry) => entry.id === id);
    const config = OPTION_GROUPS[group];
    if (!item || (config.select && id === config.fallback)) return;
    const active = !item.active;
    const options = {
      ...state.options,
      [group]: state.options[group].map((entry) =>
        entry.id === id
          ? {
              ...entry,
              active,
            }
          : entry,
      ),
    };
    if (
      !(await commitOptionChanges({
        options,
      }))
    )
      return;
    setOptionStatus(
      active
        ? "گزینه به فهرست برگشت و ذخیره شد."
        : "از فهرست انتخاب‌های تازه حذف شد؛ انتخاب فعلی و سابقهٔ معاملات محفوظ است.",
    );
    $("#option-new-name").focus({
      preventScroll: true,
    });
  };
  const deleteManagedOption = async (group, id) => {
    const item = state.options[group].find((entry) => entry.id === id);
    const config = OPTION_GROUPS[group];
    if (!item || (config.select && id === config.fallback)) return;
    const count = optionUsage(group, id);
    const effect =
      "این گزینه از معاملات مربوط حذف می‌شود؛ انتخاب‌های دیگر حفظ می‌شوند." +
      (group === "confirmations"
        ? " جزئیات و جهت مربوط به این تأییدیه هم پاک می‌شوند."
        : "");
    if (
      !(await services.confirm(
        "«" +
          item.label +
          "» برای همیشه حذف شود؟\n" +
          displayNumber(count) +
          " معامله تحت تأثیر قرار می‌گیرد. " +
          effect +
          "\nاین کار قابل بازگشت نیست؛ فقط با پشتیبان قبلی می‌توان آن را برگرداند.",
      ))
    )
      return;
    const options = {
      ...state.options,
      [group]: state.options[group].filter((entry) => entry.id !== id),
    };
    const trades = state.trades.map((trade) =>
      optionTradeValues(trade, group).includes(id)
        ? {
            ...withManagedTradeValues(
              trade,
              group,
              optionTradeValues(trade, group).filter((value) => value !== id),
            ),
            ...(group === "confirmations" &&
            Array.isArray(trade.confirmationValues)
              ? {
                  confirmationValues: trade.confirmationValues.filter(
                    (value) => !value || value.id !== id,
                  ),
                }
              : {}),
            updatedAt: nowIso(),
          }
        : trade,
    );
    const selected =
      group === "confirmations"
        ? getSelectedConfirmations().filter((value) => value !== id)
        : getSelectedConfirmations();
    const values = MULTI_OPTION_FIELDS[group]
      ? {
          [MULTI_OPTION_FIELDS[group]]: getSelectedManaged(group).filter(
            (value) => value !== id,
          ),
        }
      : group !== "confirmations" && refs[group]?.value === id
        ? {
            [group]: config.fallback,
          }
        : {};
    if (
      !(await commitOptionChanges({
        options,
        trades,
        selected,
        values,
        removedConfirmation: group === "confirmations" ? id : null,
      }))
    )
      return;
    setOptionStatus(
      "گزینه برای همیشه حذف شد؛ " + displayNumber(count) + " معامله به‌روز شد.",
    );
    $("#option-new-name").focus({
      preventScroll: true,
    });
  };
  const filterCatalogList = () => {
    const query = optionNameKey($("#option-search")?.value || "");
    const list = $("#option-manager-list");
    let visible = 0;
    $$(".option-row", list).forEach((row) => {
      row.hidden = Boolean(query && !row.dataset.searchText.includes(query));
      if (!row.hidden) visible++;
    });
    let empty = $(".catalog-search-empty", list);
    if (!empty) {
      empty = makeElement(
        "p",
        "option-help catalog-search-empty",
        "گزینه‌ای با این جست‌وجو پیدا نشد.",
      );
      list.appendChild(empty);
    }
    empty.hidden = !query || visible > 0;
  };
  const renderOptionManager = () => {
    const group = activeOptionGroup;
    const config = OPTION_GROUPS[group];
    const entries = state.options[group];
    const showArchived = $("#option-show-archived").checked;
    $("#option-group-title").textContent = config.title;
    $("#option-count").textContent =
      displayNumber(entries.filter((item) => item.active).length) +
      " فعال · " +
      displayNumber(entries.filter((item) => !item.active).length) +
      " حذف‌شده از فهرست";
    $("#option-new-name").maxLength = config.max || 50;
    $("#option-new-type-field").hidden = group !== "confirmations";
    $$("[data-option-group]", $("#option-group-tabs")).forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.optionGroup === group),
      ),
    );
    const list = $("#option-manager-list");
    list.replaceChildren();
    entries
      .filter((item) => item.active || showArchived)
      .forEach((item, index) => {
        const row = makeElement(
          "div",
          "option-row" + (item.active ? "" : " is-archived"),
        );
        row.dataset.optionId = item.id;
        row.dataset.searchText = optionNameKey(
          item.label +
            " " +
            (item.description || "") +
            (group === "confirmations"
              ? " " + confirmationCatalogTypeLabel(item.type)
              : ""),
        );
        const top = makeElement("div", "option-row-top");
        const input = document.createElement("input");
        input.type = "text";
        input.maxLength = config.max || 50;
        input.value = item.label;
        input.setAttribute("aria-label", "ویرایش نام: " + item.label);
        input.dir = "auto";
        let readType = () => item.type || "simple";
        input.addEventListener("keydown", async (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            await renameManagedOption(
              group,
              item.id,
              input.value,
              description.value,
              readType(),
            );
          }
        });
        const description = document.createElement("textarea");
        description.className = "option-description-editor";
        description.maxLength = 1000;
        description.rows = 2;
        description.value = item.description || "";
        description.dir = "auto";
        description.id = "option-description-" + group + "-" + index;
        description.placeholder =
          "توضیح اختیاری: شرایط استفاده، تعریف یا یادآوری…";
        description.setAttribute("aria-label", "ویرایش توضیح: " + item.label);
        const descriptionLabel = makeElement(
          "label",
          "option-description-label",
          "توضیح گزینه · اختیاری",
        );
        descriptionLabel.htmlFor = description.id;
        const save = optionButton(
          "ذخیره",
          async () =>
            await renameManagedOption(
              group,
              item.id,
              input.value,
              description.value,
              readType(),
            ),
        );
        save.setAttribute(
          "aria-label",
          "ذخیره نام، توضیح و نوع: " + item.label,
        );
        top.append(input, save);
        const bottom = makeElement("div", "option-row-bottom");
        const base = config.select && item.id === config.fallback;
        bottom.appendChild(
          makeElement(
            "span",
            "option-row-meta",
            displayNumber(optionUsage(group, item.id)) +
              " معامله" +
              (base
                ? " · گزینهٔ پایه"
                : item.active
                  ? ""
                  : " · حذف‌شده از فهرست"),
          ),
        );
        if (!base) {
          const actions = makeElement("div", "option-row-actions");
          const toggle = optionButton(
            item.active ? "حذف از فهرست" : "بازگرداندن به فهرست",
            async () => await toggleManagedOption(group, item.id),
          );
          toggle.setAttribute(
            "aria-label",
            (item.active ? "حذف از فهرست: " : "بازگرداندن: ") + item.label,
          );
          const remove = optionButton(
            "حذف دائمی",
            async () => await deleteManagedOption(group, item.id),
            "option-delete",
          );
          remove.setAttribute("aria-label", "حذف دائمی: " + item.label);
          actions.append(toggle, remove);
          bottom.appendChild(actions);
        }
        row.appendChild(top);
        if (group === "confirmations") {
          const editor = makeElement("fieldset", "option-type-editor");
          editor.appendChild(
            makeElement("legend", "", "نوع تأییدیه: " + item.label),
          );
          const choices = makeElement("div", "option-type-choices");
          ["simple", "details", "direction", "direction_details"].forEach(
            (type) => {
              const label = makeElement("label", "option-type-choice");
              const radio = document.createElement("input");
              radio.type = "radio";
              radio.name = "option-type-" + index;
              radio.value = type;
              radio.checked = type === (item.type || "simple");
              label.append(
                radio,
                makeElement("span", "", confirmationCatalogTypeLabel(type)),
              );
              choices.appendChild(label);
            },
          );
          readType = () =>
            $("input:checked", choices)?.value || item.type || "simple";
          editor.append(
            choices,
            makeElement(
              "p",
              "option-help",
              "نوع با دکمهٔ ذخیره ثبت می‌شود. تغییر نوع فقط برای انتخاب‌های جدید است؛ جزئیات و جهت پوزیشن‌های قبلی حفظ می‌شوند.",
            ),
          );
          row.appendChild(editor);
        }
        row.append(descriptionLabel, description, bottom);
        list.appendChild(row);
      });
    if (!list.children.length)
      list.appendChild(
        makeElement(
          "p",
          "option-help",
          "هنوز گزینه‌ای در این فهرست نیست. از کادر بالا گزینهٔ تازه بساز.",
        ),
      );
    filterCatalogList();
  };
  const renderCatalogRoute = (group = "confirmations") => {
    const nextGroup = Object.hasOwn(OPTION_GROUPS, group)
      ? group
      : "confirmations";
    if (activeOptionGroup !== nextGroup) {
      $("#option-new-name").value = "";
      $("#option-new-description").value = "";
      $("#option-new-type").value = "simple";
      listboxControllers.get($("#option-new-type"))?.sync();
      setOptionStatus("");
    }
    activeOptionGroup = nextGroup;
    const back = $("#catalog-return");
    if (back) {
      back.href = catalogReturnHash;
      const fromSettings = /^#settings(?:\/|$)/.test(catalogReturnHash);
      back.hidden =
        !fromSettings &&
        !/^#(?:trade-new$|trade-edit=|trade-close=|form-card$)/.test(
          catalogReturnHash,
        );
      back.textContent = fromSettings
        ? "بازگشت به تنظیمات"
        : "بازگشت به معامله";
    }
    renderOptionManager();
  };
  const openOptionManager = async (group = "confirmations") => {
    if (!/^#catalogs(?:\/|$)/.test(location.hash))
      catalogReturnHash = location.hash || "#dashboard";
    const nextGroup = Object.hasOwn(OPTION_GROUPS, group)
      ? group
      : "confirmations";
    renderCatalogRoute(nextGroup);
    await navigateJournalRoute("#catalogs/" + nextGroup);
    $("#option-new-name").focus({
      preventScroll: true,
    });
  };
  const initializeOptionManager = () => {
    Object.entries(OPTION_GROUPS).forEach(([group, config]) => {
      const tab = optionButton(
        config.title,
        async () => await openOptionManager(group),
      );
      tab.dataset.optionGroup = group;
      tab.setAttribute("aria-pressed", String(group === activeOptionGroup));
      $("#option-group-tabs").appendChild(tab);
    });
    $("#manage-options-top")?.addEventListener(
      "click",
      async () => await openOptionManager(),
    );
    $("#settings-confirmation-catalogs").addEventListener(
      "click",
      async () => await openOptionManager("confirmations"),
    );
    $("#settings-strategy-catalogs").addEventListener(
      "click",
      async () => await openOptionManager("strategy"),
    );
    $("#recover-option-catalog").addEventListener("click", () =>
      $("#catalog-recovery-file").click(),
    );
    $("#catalog-recovery-file").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (file) await recoverOptionCatalog(file);
    });
    $("#close-option-manager")?.addEventListener(
      "click",
      async () => await navigateJournalRoute(catalogReturnHash),
    );
    $("#option-search")?.addEventListener("input", filterCatalogList);
    $("#option-show-archived").addEventListener("change", renderOptionManager);
    $("#option-add-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (
        await addManagedOption(
          activeOptionGroup,
          $("#option-new-name").value,
          false,
          $("#option-new-description").value,
          $("#option-new-type").value,
        )
      ) {
        $("#option-new-name").value = "";
        $("#option-new-description").value = "";
      }
      $("#option-new-name").focus();
    });
    refs.confirmationOptions.addEventListener("change", (event) => {
      if (event.target.checked && getSelectedConfirmations().length > 25) {
        event.target.checked = false;
        showToast("برای هر معامله حداکثر ۲۵ تأییدیه انتخاب کن.", true);
      }
    });
    refreshManagedOptions();
  };
  const readWeekendDays = () =>
    $$("[data-weekday]", refs.weekendDays)
      .filter((button) => button.getAttribute("aria-pressed") === "true")
      .map((button) => Number(button.dataset.weekday));
  const selectedWeekendLabels = (days) => {
    const selected = new Set(Array.isArray(days) ? days : []);
    return WEEKDAY_UI_ORDER.filter((day) => selected.has(day)).map(
      (day) => WEEKDAY_LABELS[day],
    );
  };
  const weekendGroupLabel = (days) => {
    const labels = selectedWeekendLabels(days);
    if (!labels.length) return "آخرهفته (بدون روز انتخابی)";
    if (labels.length === 7) return "آخرهفته (همهٔ روزها)";
    return (
      "آخرهفته (" +
      new Intl.ListFormat("fa-IR", {
        style: "long",
        type: "conjunction",
      }).format(labels) +
      ")"
    );
  };
  const syncWeekendUI = (days) => {
    const selected = new Set(Array.isArray(days) ? days : []);
    $$("[data-weekday]", refs.weekendDays).forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(selected.has(Number(button.dataset.weekday))),
      ),
    );
    const labels = selectedWeekendLabels(days);
    refs.weekendSummary.textContent =
      labels.length === 0
        ? "آخرهفته‌ای تعریف نشده؛ همهٔ روزها کاری‌اند."
        : labels.length === 7
          ? "همهٔ روزها آخرهفته محسوب می‌شوند."
          : "آخرهفته: " +
            new Intl.ListFormat("fa-IR", {
              style: "long",
              type: "conjunction",
            }).format(labels);
  };
  const classifyWeekpart = (iso, weekendDays = state.settings.weekendDays) => {
    const key = weekdayKey(iso);
    if (key === "unknown") return "unknown";
    return new Set(weekendDays).has(Number(key)) ? "weekend" : "weekday";
  };
  const defaultNewTradeAccountId = () =>
    state.accounts.find(
      (account) => account.id === activeAccountScope && !account.archived,
    )?.id ||
    state.accounts.find((account) => !account.archived)?.id ||
    "";
  const getDefaultTradeAccountId = () => {
    const account = getAccountById($("#trade-account").value);
    return account && !account.archived
      ? account.id
      : defaultNewTradeAccountId();
  };
  const getFormAccount = () =>
    getAccountById($("#trade-account").value) ||
    getAccountById(defaultNewTradeAccountId());
  let generalSettingsInitialized = false;
  let generalSettingsDirty = false;
  const syncSettingsUI = (forceGeneral = false) => {
    const account = getFormAccount();
    const defaults = account || state.settings;
    if (
      !generalSettingsInitialized ||
      forceGeneral === true ||
      !generalSettingsDirty
    ) {
      refs.currency.value = state.settings.currency;
      syncWeekendUI(state.settings.weekendDays);
      generalSettingsInitialized = true;
    }
    setNumericInputValue(refs.accountBalance, defaults.accountBalance);
    setNumericInputValue(refs.riskPercent, defaults.riskPercent);
    setNumericInputValue(refs.fixedRisk, defaults.fixedRisk);
    const riskRadio = $(
      "input[name='risk-mode'][value='" + defaults.riskMode + "']",
    );
    if (riskRadio) riskRadio.checked = true;
    const fixed = defaults.riskMode === "fixed";
    refs.percentRiskField.classList.toggle("is-hidden", fixed);
    refs.fixedRiskField.classList.toggle("is-hidden", !fixed);
    [
      refs.accountBalance,
      refs.riskPercent,
      refs.fixedRisk,
      ...$$('input[name="risk-mode"]'),
    ].forEach((input) => {
      input.disabled = !account;
    });
    const budget = account
      ? "«" +
        account.name +
        "» · موجودی " +
        displayMoney(account.accountBalance, account.currency) +
        " · بودجهٔ ریسک " +
        displayMoney(
          account.riskMode === "fixed"
            ? account.fixedRisk
            : (account.accountBalance * account.riskPercent) / 100,
        )
      : "برای بودجه‌بندی ریسک، یک حساب فعال بساز یا بازگردان.";
    const context = $("#account-settings-context");
    if (context) context.textContent = budget;
    const editorBudget = $("#editor-account-budget");
    if (editorBudget) editorBudget.textContent = budget;
  };
  const syncProjectionDefaults = () => {
    const defaults = getFormAccount() || state.settings;
    const derivedRisk =
      defaults.riskMode === "fixed"
        ? (defaults.fixedRisk / defaults.accountBalance) * 100
        : defaults.riskPercent;
    setNumericInputValue(
      refs.projectionRisk,
      Math.min(20, Math.max(0.01, derivedRisk)),
    );
    setNumericInputValue(refs.projectionBalance, defaults.accountBalance);
  };
  const setGeneralSettingsMessage = (message, error = false) => {
    const messageElement = $("#general-settings-message");
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.classList.toggle("error", error);
    }
  };
  const updateSettings = async () => {
    const currency = refs.currency.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    if (!currency) {
      refs.currency.setAttribute("aria-invalid", "true");
      setGeneralSettingsMessage(
        "واحد حساب را با حروف لاتین یا عدد وارد کن؛ مانند USD یا USDT.",
        true,
      );
      refs.currency.focus();
      return false;
    }
    const nextSettings = {
      ...state.settings,
      currency,
      weekendDays: readWeekendDays(),
    };
    if (
      !(await persist({
        ...state,
        settings: nextSettings,
      }))
    ) {
      generalSettingsDirty = true;
      setGeneralSettingsMessage(
        "تنظیمات ذخیره نشد؛ مقادیر واردشده حفظ شدند. پیام ذخیره‌سازی ژورنال را بررسی کن.",
        true,
      );
      return false;
    }
    generalSettingsDirty = false;
    refs.currency.removeAttribute("aria-invalid");
    syncSettingsUI(true);
    updateCalculator();
    renderAll();
    renderProjection();
    setGeneralSettingsMessage("تنظیمات عمومی ذخیره شد.");
    showToast("تنظیمات عمومی ذخیره شد.");
    return true;
  };
  // Hidden compatibility controls continue to edit the assigned account only.
  const updateCompatibilityAccountBudget = async () => {
    const account = getFormAccount();
    if (!account) return;
    const riskPercent = positiveNumber(refs.riskPercent.value);
    const budget = {
      accountBalance:
        positiveNumber(refs.accountBalance.value) ?? account.accountBalance,
      riskMode:
        $("input[name='risk-mode']:checked")?.value === "fixed"
          ? "fixed"
          : "percent",
      riskPercent:
        riskPercent !== null && riskPercent <= 100
          ? riskPercent
          : account.riskPercent,
      fixedRisk: positiveNumber(refs.fixedRisk.value) ?? account.fixedRisk,
    };
    const settings =
      account.id === DEFAULT_ACCOUNT_ID
        ? {
            ...state.settings,
            ...budget,
          }
        : state.settings;
    const accounts = state.accounts.map((item) =>
      item.id === account.id
        ? {
            ...item,
            ...budget,
          }
        : item,
    );
    if (
      !(await persist({
        ...state,
        settings,
        accounts,
      }))
    )
      syncSettingsUI();
    syncSettingsUI();
    updateCalculator();
    renderAll();
  };
  const initializeGeneralSettings = () => {
    $("#save-general-settings")?.addEventListener("click", updateSettings);
    refs.currency.addEventListener("input", () => {
      refs.currency.value = refs.currency.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      refs.currency.removeAttribute("aria-invalid");
      generalSettingsDirty = true;
      setGeneralSettingsMessage("تغییرات هنوز ذخیره نشده‌اند.");
    });
    refs.weekendDays.addEventListener("click", (event) => {
      const button = event.target.closest?.("button[data-weekday]");
      if (!button || !refs.weekendDays.contains(button)) return;
      button.setAttribute(
        "aria-pressed",
        String(button.getAttribute("aria-pressed") !== "true"),
      );
      syncWeekendUI(readWeekendDays());
      generalSettingsDirty = true;
      setGeneralSettingsMessage("تغییرات هنوز ذخیره نشده‌اند.");
    });
  };
  const setCalcText = (id, value) => {
    $(id).textContent = value;
  };
  const announceCalculator = (message) => {
    clearTimeout(calcAnnounceTimer);
    calcAnnounceTimer = setTimeout(() => {
      $("#calc-live").textContent = message;
    }, 450);
  };
  const updateMaxTouchedRPreview = () => {
    const existing = editingId
      ? state.trades.find((trade) => trade.id === editingId)
      : null;
    const initialRisk =
      existing && existing.status !== "planned"
        ? existing.plannedRisk
        : calculatePlan({
            ...services.formEconomics(),
            direction: readDirection(),
            entry: refs.entry.value,
            stop: refs.stop.value,
            target: refs.target.value,
            quantity: refs.quantity.value,
          }).plannedRisk;
    const excursion = parseExcursion(refs.maxUnrealizedProfit.value);
    const value = calculateMaxTouchedR({
      status: refs.status.value,
      plannedRisk: initialRisk,
      maxUnrealizedProfit: excursion.valid ? excursion.value : null,
    });
    $("#form-max-touched-r").textContent = displayR(value);
    $("#form-max-touched-r-context").textContent =
      "اوج سود باز همین پوزیشن ÷ ریسک اولیهٔ خودش؛ پیش از کارمزد." +
      (Number.isFinite(initialRisk) && initialRisk > 0
        ? " مبنای ریسک: " + displayMoney(initialRisk) + "."
        : " ریسک اولیه و اوج سود باز را ثبت کن.") +
      " با R/R هدف و R تحقق‌یافته فرق دارد.";
  };
  const updateRealizedPreview = () => {
    updateMaxTouchedRPreview();
    updatePartialExitEditor();
    const existing = editingId
      ? state.trades.find((trade) => trade.id === editingId)
      : null;
    const input = {
      ...services.formEconomics(),
      status: refs.status.value,
      direction: readDirection(),
      entry: refs.entry.value,
      stop: refs.stop.value,
      target: refs.target.value,
      quantity: refs.quantity.value,
      exit: refs.exit.value,
      fees: refs.fees.value,
      partialExits: readPartialExitsDraft(),
      plannedRisk:
        existing && existing.status !== "planned" ? existing.plannedRisk : null,
    };
    const result =
      refs.status.value === "closed" ? calculateClosed(input) : null;
    const output = $("#form-realized-pnl");
    output.textContent = result?.valid ? displayMoney(result.netPnl) : "—";
    applyValueTone(output, result?.valid ? result.netPnl : 0);
  };
  const updateCalculator = () => {
    updateRealizedPreview();
    const direction = readDirection();
    const plan = calculatePlan({
      ...services.formEconomics(),
      direction,
      entry: refs.entry.value,
      stop: refs.stop.value,
      target: refs.target.value,
      quantity: refs.quantity.value,
    });
    const budget = getRiskBudget();
    setCalcText("#calc-budget", displayMoney(budget));
    lastSuggestedSize = null;
    refs.useSuggested.disabled = true;
    if (!plan.valid) {
      setCalcText("#calc-ratio", "—");
      $("#calc-ratio").insertAdjacentHTML("beforeend", "<span> R/R</span>");
      setCalcText("#calc-caption", "ورود، حد ضرر و هدف معتبر را وارد کن.");
      setCalcText("#calc-stop", "—");
      setCalcText("#calc-target", "—");
      setCalcText("#calc-size", "—");
      setCalcText("#calc-risk", "—");
      setCalcText("#calc-reward", "—");
      $("#rr-risk-bar").style.width = "50%";
      $("#rr-reward-bar").style.width = "50%";
      const anyPrice = refs.entry.value || refs.stop.value || refs.target.value;
      $("#calc-warning").textContent = anyPrice ? plan.reason : "";
      announceCalculator(anyPrice ? plan.reason : "");
      return;
    }
    const ratio = $("#calc-ratio");
    ratio.textContent = displayNumber(plan.plannedRR, 2);
    const suffix = document.createElement("span");
    suffix.textContent = " R/R";
    ratio.appendChild(suffix);
    setCalcText(
      "#calc-caption",
      plan.plannedRR >= 2
        ? "پاداش احتمالی دست‌کم دو برابر ریسک اولیه است."
        : "بررسی کن که این ستاپ حداقل مزیت موردنظرت را دارد.",
    );
    setCalcText("#calc-stop", displayPrice(plan.stopDistance));
    setCalcText("#calc-target", displayPrice(plan.targetDistance));
    setCalcText("#calc-risk", displayMoney(plan.plannedRisk));
    setCalcText("#calc-reward", displayMoney(plan.plannedReward));
    $("#calc-warning").textContent = "";
    const riskShare = Math.max(8, Math.min(72, 100 / (1 + plan.plannedRR)));
    $("#rr-risk-bar").style.width = riskShare + "%";
    $("#rr-reward-bar").style.width = 100 - riskShare + "%";
    if (budget !== null) {
      const suggested = budget / plan.riskPerQuantity;
      if (Number.isFinite(suggested) && suggested > 0) {
        lastSuggestedSize = suggested;
        setCalcText("#calc-size", displayNumber(lastSuggestedSize, 8));
        refs.useSuggested.disabled = false;
      } else {
        setCalcText("#calc-size", "—");
        $("#calc-warning").textContent =
          "این مقادیر خارج از محدودهٔ عددی پشتیبانی‌شده‌اند.";
      }
    } else {
      setCalcText("#calc-size", "—");
      $("#calc-warning").textContent =
        "برای محاسبهٔ حجم، بودجهٔ ریسک معتبر وارد کن.";
    }
    announceCalculator(
      "نسبت پاداش به ریسک " +
        displayNumber(plan.plannedRR, 2) +
        ". " +
        "ریسک برنامه " +
        displayMoney(plan.plannedRisk) +
        " و پاداش برنامه " +
        displayMoney(plan.plannedReward) +
        (lastSuggestedSize === null
          ? "."
          : "، حجم پیشنهادی " + displayNumber(lastSuggestedSize, 8) + "."),
    );
  };
  const toggleCloseFields = () => {
    const planned = refs.status.value === "planned";
    refs.excursionFields.classList.toggle("is-hidden", planned);
    [refs.maxUnrealizedProfit, refs.maxUnrealizedLoss].forEach((input) => {
      input.disabled = planned;
      if (planned) input.setCustomValidity("");
    });
    const closed = refs.status.value === "closed";
    refs.closeFields.classList.toggle("visible", closed);
    refs.closeDate.required = closed;
    refs.closeTime.required = closed;
    refs.exit.required = closed;
    if (closed) {
      setAccordion(refs.closeFields, true);
      if (!refs.closeDate.value) setPersianDateInput(refs.closeDate, today());
      if (!refs.closeTime.value)
        setTimeInputValue(refs.closeTime, currentTime());
    } else {
      setAccordion(refs.closeFields, false);
    }
  };
  const scrollBehavior = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const clearFormInvalidState = () => {
    $$(".field-error", refs.form)
      .concat(
        $$(".field-error", $("#shell-position-account")),
        $$(".confirmation-popover-panel .field-error"),
      )
      .forEach((node) => node.remove());
    Array.from(refs.form.elements).forEach((control) =>
      control.setCustomValidity?.(""),
    );
    $$('[aria-invalid="true"]', refs.form)
      .concat(
        $$('[aria-invalid="true"]', $("#shell-position-account")),
        $$('.confirmation-popover-panel [aria-invalid="true"]'),
      )
      .forEach((control) => {
        control.removeAttribute("aria-invalid");
        if (
          control.getAttribute("aria-describedby") === "form-message" ||
          control.getAttribute("aria-describedby")?.endsWith("-error")
        )
          control.removeAttribute("aria-describedby");
      });
    listboxControllers.forEach((controller) => {
      if (controller.select.form !== refs.form) return;
      controller.button.removeAttribute("aria-invalid");
      if (
        controller.button.getAttribute("aria-describedby") === "form-message" ||
        controller.button.getAttribute("aria-describedby")?.endsWith("-error")
      )
        controller.button.removeAttribute("aria-describedby");
    });
  };
  let draftTradeImages = [];
  let imageEditorToken = 0;
  let imagePreviewToken = 0;
  let imageProcessingCount = 0;
  let imageEditorQueue = Promise.resolve();
  let imageEditorNotice = "";
  let imageEditorHasError = false;
  const MAX_EDITOR_TRADE_IMAGES = 6;
  const MAX_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
  const MAX_IMAGE_ENCODED_BYTES = 2 * 1024 * 1024;
  const TRADE_IMAGE_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
  ]);
  const updateImageEditorStatus = () => {
    const status = $("#trade-image-status");
    if (!status) return;
    const count = draftTradeImages.length;
    status.textContent = imageProcessingCount
      ? "در حال آماده‌سازی " +
        toPersianDigits(imageProcessingCount) +
        " تصویر… لطفاً تا پایان پردازش صبر کن."
      : imageEditorNotice ||
        (count
          ? toPersianDigits(count) +
            " از ۶ تصویر انتخاب شده است. با ذخیرهٔ معامله، تصاویر هم ثبت می‌شوند."
          : "هنوز تصویری اضافه نشده است.");
    status.classList.toggle(
      "is-error",
      !imageProcessingCount && imageEditorHasError,
    );
    $("#trade-image-editor").setAttribute(
      "aria-busy",
      String(imageProcessingCount > 0),
    );
    $("#choose-trade-images").disabled = count >= MAX_EDITOR_TRADE_IMAGES;
    refs.saveTrade.disabled = imageProcessingCount > 0;
  };
  const renderDraftTradeImages = () => {
    const previewToken = ++imagePreviewToken;
    const container = $("#trade-image-previews");
    if (!container) return;
    container.replaceChildren();
    draftTradeImages.forEach(async (metadata) => {
      const figure = document.createElement("figure");
      figure.className = "trade-image-preview";
      const open = document.createElement("button");
      open.type = "button";
      open.className = "trade-image-preview-open";
      open.setAttribute("aria-label", "نمایش تصویر " + metadata.name);
      open.textContent = "در حال بارگذاری…";
      open.addEventListener(
        "click",
        async () =>
          await openTradeImage(metadata.id, metadata.name, draftTradeImages),
      );
      const name = document.createElement("figcaption");
      name.className = "trade-image-preview-name";
      name.textContent = metadata.name;
      name.title = metadata.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "button ghost trade-image-preview-remove";
      remove.textContent = "حذف از معامله";
      window.EdgeIcons?.decorate(remove, "trash");
      remove.setAttribute(
        "aria-label",
        "حذف تصویر " + metadata.name + " از معامله",
      );
      remove.addEventListener("click", () => {
        draftTradeImages = draftTradeImages.filter(
          (image) => image.id !== metadata.id,
        );
        void services.setDraftImages(draftTradeImages, imageEditorToken);
        imageEditorNotice = "";
        imageEditorHasError = false;
        renderDraftTradeImages();
        updateImageEditorStatus();
        $("#choose-trade-images").focus();
      });
      figure.append(open, name, remove);
      container.appendChild(figure);
      getTradeImage(metadata.id)
        .then((asset) => {
          if (previewToken !== imagePreviewToken || !open.isConnected) return;
          if (!asset?.dataUrl) {
            open.textContent = "تصویر در این مرورگر موجود نیست";
            return;
          }
          const image = document.createElement("img");
          image.src = asset.dataUrl;
          image.loading = "lazy";
          image.decoding = "async";
          image.alt = metadata.name;
          image.width = metadata.width;
          image.height = metadata.height;
          open.replaceChildren(image);
        })
        .catch(() => {
          if (previewToken === imagePreviewToken && open.isConnected)
            open.textContent = "بارگذاری تصویر ممکن نشد";
        });
    });
    updateImageEditorStatus();
  };
  const setDraftTradeImages = (images) => {
    imageEditorToken += 1;
    imageProcessingCount = 0;
    imageEditorQueue = Promise.resolve();
    imageEditorNotice = "";
    imageEditorHasError = false;
    draftTradeImages = Array.isArray(images)
      ? images.slice(0, MAX_EDITOR_TRADE_IMAGES).map((image) => ({
          ...image,
        }))
      : [];
    void services.setDraftImages(draftTradeImages, imageEditorToken);
    renderDraftTradeImages();
  };
  const compressTradeImage = async (file) => {
    if (!TRADE_IMAGE_MIME_TYPES.has(file.type.toLowerCase()))
      throw new Error("فقط فایل‌های PNG، JPG، WebP و GIF پشتیبانی می‌شوند.");
    if (!file.size || file.size > MAX_IMAGE_SOURCE_BYTES)
      throw new Error("حجم فایل تصویر باید کمتر از ۲۰ مگابایت باشد.");
    const sourceURL = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const decoded = new Image();
        const timer = setTimeout(() => {
          decoded.src = "";
          reject(new Error("خواندن تصویر طول کشید. دوباره تلاش کن."));
        }, 20000);
        decoded.onload = () => {
          clearTimeout(timer);
          resolve(decoded);
        };
        decoded.onerror = () => {
          clearTimeout(timer);
          reject(new Error("فایل انتخاب‌شده یک تصویر معتبر نیست."));
        };
        decoded.src = sourceURL;
      });
      if (
        !image.naturalWidth ||
        !image.naturalHeight ||
        image.naturalWidth * image.naturalHeight > 40000000
      )
        throw new Error("ابعاد تصویر خیلی بزرگ است؛ تصویر کوچک‌تری انتخاب کن.");
      const scale = Math.min(
        1,
        2000 / Math.max(image.naturalWidth, image.naturalHeight),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      let quality = 0.9;
      let blob;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const context = canvas.getContext("2d");
        if (!context) throw new Error("مرورگر نتوانست تصویر را آماده کند.");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/webp", quality),
        );
        if (!blob) throw new Error("آماده‌سازی تصویر ممکن نشد.");
        if (blob.size <= MAX_IMAGE_ENCODED_BYTES) break;
        if (quality > 0.45) quality -= 0.15;
        else {
          canvas.width = Math.max(1, Math.floor(canvas.width * 0.8));
          canvas.height = Math.max(1, Math.floor(canvas.height * 0.8));
        }
      }
      if (blob.size > MAX_IMAGE_ENCODED_BYTES)
        throw new Error(
          "تصویر برای ذخیره خیلی بزرگ است؛ تصویر کوچک‌تری انتخاب کن.",
        );
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(new Error("خواندن تصویر آماده‌شده ممکن نشد."));
        reader.readAsDataURL(blob);
      });
      const extension =
        blob.type === "image/webp"
          ? ".webp"
          : blob.type === "image/jpeg"
            ? ".jpg"
            : ".png";
      const originalName = String(file.name || "تصویر معامله")
        .replace(/\.[^.]+$/, "")
        .slice(0, 150);
      return {
        id: "img-" + makeId(),
        name: originalName + extension,
        type: blob.type,
        size: blob.size,
        width: canvas.width,
        height: canvas.height,
        dataUrl,
      };
    } finally {
      URL.revokeObjectURL(sourceURL);
    }
  };
  const addTradeImageFiles = (files) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const token = imageEditorToken;
    openAccordionFor($("#trade-image-dropzone"));
    imageEditorNotice = "";
    imageEditorHasError = false;
    imageProcessingCount += selected.length;
    updateImageEditorStatus();
    selected.forEach((file) => {
      imageEditorQueue = imageEditorQueue.then(async () => {
        if (token !== imageEditorToken) return;
        try {
          if (draftTradeImages.length >= MAX_EDITOR_TRADE_IMAGES)
            throw new Error(
              "هر معامله حداکثر ۶ تصویر دارد. برای افزودن تصویر جدید، یکی را حذف کن.",
            );
          const asset = await compressTradeImage(file);
          if (token !== imageEditorToken) return;
          const storedMetadata = await putTradeImage(asset, token);
          if (token !== imageEditorToken) return;
          const { dataUrl, ...metadata } = asset;
          if (!draftTradeImages.some((image) => image.id === storedMetadata.id))
            draftTradeImages.push(storedMetadata);
          renderDraftTradeImages();
        } catch (error) {
          if (token === imageEditorToken) {
            imageEditorNotice =
              error?.message || "ذخیرهٔ تصویر در این مرورگر ممکن نشد.";
            imageEditorHasError = true;
            showToast(imageEditorNotice, true);
          }
        } finally {
          if (token === imageEditorToken) {
            imageProcessingCount = Math.max(0, imageProcessingCount - 1);
            updateImageEditorStatus();
          }
        }
      });
    });
  };
  const initializeTradeImageEditor = () => {
    const zone = $("#trade-image-dropzone");
    const input = $("#trade-image-files");
    const choose = $("#choose-trade-images");
    choose.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (event) => {
      if (event.target !== zone || (event.key !== "Enter" && event.key !== " "))
        return;
      event.preventDefault();
      if (!choose.disabled) input.click();
    });
    input.addEventListener("change", () => {
      addTradeImageFiles(input.files);
      input.value = "";
    });
    const hasFiles = (event) =>
      Array.from(event.dataTransfer?.types || []).includes("Files");
    refs.form.addEventListener("dragover", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      openAccordionFor(zone);
      zone.classList.add("is-dragging");
    });
    refs.form.addEventListener("dragleave", (event) => {
      if (!refs.form.contains(event.relatedTarget))
        zone.classList.remove("is-dragging");
    });
    refs.form.addEventListener("drop", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      zone.classList.remove("is-dragging");
      addTradeImageFiles(event.dataTransfer.files);
    });
    refs.form.addEventListener("paste", (event) => {
      const images = Array.from(event.clipboardData?.items || [])
        .filter(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
        .map((item) => item.getAsFile())
        .filter(Boolean);
      if (!images.length) return;
      event.preventDefault();
      addTradeImageFiles(images);
    });
    renderDraftTradeImages();
  };

  // Rows stay mounted during page navigation and while their previews update.
  let partialExitEditorSerial = 0;
  const partialExitRows = () =>
    Array.from(
      document.querySelectorAll("#partial-exit-list > .partial-exit-row"),
    );
  const readPartialExitsDraft = () =>
    partialExitRows().map((row) => {
      const field = (name) =>
        row.querySelector('[data-partial-field="' + name + '"]');
      const date = field("date").value.trim();
      const time = field("time").value.trim();
      return {
        id: row.dataset.partialId,
        r: field("r").value,
        percent: field("percent").value,
        date: date ? parsePersianDate(date) || date : "",
        time: time ? canonicalTime(time) || time : "",
      };
    });
  const createPartialExitRow = (source = {}) => {
    const row = document.createElement("article");
    row.className = "partial-exit-row";
    row.dataset.partialId =
      typeof source.id === "string" && source.id
        ? source.id
        : "partial-" + makeId();
    const prefix = "partial-exit-" + ++partialExitEditorSerial;
    const header = document.createElement("div");
    header.className = "partial-exit-row-header";
    const heading = document.createElement("h3");
    heading.id = prefix + "-heading";
    row.setAttribute("aria-labelledby", heading.id);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button ghost partial-exit-remove";
    remove.dataset.removePartialExit = "";
    remove.setAttribute("aria-label", "حذف خروج پله‌ای");
    const icon = document.createElement("span");
    icon.className = "heroicon-host";
    icon.dataset.heroicon = "trash";
    icon.setAttribute("aria-hidden", "true");
    remove.append(icon);
    header.append(heading, remove);
    const grid = document.createElement("div");
    grid.className = "field-grid four";
    const specifications = [
      ["r", "R خروج (مثبت، صفر یا منفی)", "مثلاً ۱٫۵", 24],
      ["percent", "درصد از حجم اولیه (%)", "مثلاً ۲۵", 24],
      ["date", "تاریخ خروج شمسی (اختیاری)", "۱۴۰۵/۰۷/۲۲", 10],
      ["time", "ساعت خروج (اختیاری)", "۱۴:۳۰", 5],
    ];
    specifications.forEach(([name, title, placeholder, maxlength]) => {
      const field = document.createElement("div");
      field.className = "field";
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "text";
      input.id = prefix + "-" + name;
      input.name = prefix + "-" + name;
      input.className = "numeric";
      input.inputMode =
        name === "date" || name === "time" ? "numeric" : "decimal";
      input.autocomplete = "off";
      input.maxLength = maxlength;
      input.placeholder = placeholder;
      input.dataset.partialField = name;
      input.setAttribute("aria-describedby", "partial-exit-help");
      label.htmlFor = input.id;
      label.textContent = title;
      if (name === "r" || name === "percent") {
        input.dataset.localizedNumber = "";
        setNumericInputValue(input, source[name] ?? "");
        input.addEventListener("input", () => localizeNumericInput(input));
        input.addEventListener("blur", () => localizeNumericInput(input));
      } else if (name === "date") {
        input.value =
          source.date && validDate(source.date)
            ? formatPersianDateInput(source.date)
            : String(source.date || "");
        input.addEventListener("input", () => {
          input.value = toPersianDigits(toEnglishDigits(input.value));
          input.setCustomValidity("");
          input.removeAttribute("aria-invalid");
        });
        input.addEventListener("blur", () => {
          const date = parsePersianDate(input.value);
          if (date) input.value = formatPersianDateInput(date);
        });
      } else {
        input.dataset.persianTime = "";
        setTimeInputValue(input, source.time || "");
        input.addEventListener("input", () => localizeTimeInput(input));
        input.addEventListener("blur", () => {
          const time = canonicalTime(input.value);
          if (time) setTimeInputValue(input, time);
          else localizeTimeInput(input);
        });
      }
      field.append(label, input);
      grid.append(field);
    });
    const values = document.createElement("dl");
    values.className = "partial-exit-leg-values";
    [
      ["price", "قیمت معادل خروج"],
      ["quantity", "حجم خارج‌شده"],
      ["grossPnl", "سود / زیان ناخالص این پله"],
    ].forEach(([name, title]) => {
      const item = document.createElement("div");
      const label = document.createElement("dt");
      label.textContent = title;
      const output = document.createElement("dd");
      output.dataset.partialValue = name;
      output.textContent = "—";
      item.append(label, output);
      values.append(item);
    });
    row.append(header, grid, values);
    globalThis.EdgeIcons?.apply?.(row);
    return row;
  };
  const renumberPartialExitRows = () =>
    partialExitRows().forEach((row, index) => {
      row.querySelector("h3").textContent =
        "خروج پله‌ای " + toPersianDigits(index + 1);
      row
        .querySelector("[data-remove-partial-exit]")
        .setAttribute(
          "aria-label",
          "حذف خروج پله‌ای " + toPersianDigits(index + 1),
        );
    });
  const setPartialExitsDraft = (rows) => {
    const list = document.getElementById("partial-exit-list");
    if (!list) return;
    list.replaceChildren(
      ...(Array.isArray(rows) ? rows : []).map(createPartialExitRow),
    );
    renumberPartialExitRows();
  };
  const partialExitEditorInput = () => {
    const existing = editingId
      ? state.trades.find((trade) => trade.id === editingId)
      : null;
    return {
      ...services.formEconomics(),
      direction: readDirection(),
      status: refs.status.value,
      openDate: readPersianDateInput(refs.openDate),
      openTime: canonicalTime(refs.openTime.value),
      closeDate: readPersianDateInput(refs.closeDate),
      closeTime: canonicalTime(refs.closeTime.value),
      entry: refs.entry.value,
      stop: refs.stop.value,
      target: refs.target.value,
      quantity: refs.quantity.value,
      fees: refs.fees.value,
      partialExits: readPartialExitsDraft(),
      ...(existing && existing.status !== "planned"
        ? {
            plannedRisk: existing.plannedRisk,
          }
        : {}),
    };
  };
  const updatePartialExitEditor = () => {
    const list = document.getElementById("partial-exit-list");
    if (!list) return null;
    const rows = partialExitRows();
    const planned = refs.status.value === "planned";
    document.getElementById("partial-exit-plan-note").hidden = !planned;
    document.getElementById("add-partial-exit").disabled =
      planned || rows.length >= MAX_PARTIAL_EXITS;
    list.querySelectorAll("input").forEach((input) => {
      input.disabled = planned;
    });
    document.getElementById("partial-exit-empty").hidden = rows.length > 0;
    const input = partialExitEditorInput();
    const result = calculatePartialExits(input);
    const allExited =
      refs.status.value === "closed" &&
      result.valid &&
      result.closedPercent === 100;
    refs.exit.required = refs.status.value === "closed" && !allExited;
    refs.exit.disabled = allExited;
    if (allExited) refs.exit.setCustomValidity("");
    document.getElementById("partial-final-exit-note").hidden = !allExited;
    const hasValues =
      Boolean(input.fills?.length) ||
      input.partialExits.some(
        (row) => row.r !== "" || row.percent !== "" || row.date || row.time,
      );
    const known = result.valid && !planned;
    rows.forEach((row) => {
      const derived = result.derivedExits?.find(
        (exit) => exit.id === row.dataset.partialId,
      );
      const price = row.querySelector('[data-partial-value="price"]');
      const quantity = row.querySelector('[data-partial-value="quantity"]');
      const cash = row.querySelector('[data-partial-value="grossPnl"]');
      price.textContent =
        known && derived ? displayNumber(derived.price, 6) : "—";
      quantity.textContent =
        known && derived ? displayNumber(derived.quantity, 6) : "—";
      cash.textContent =
        known && derived ? displayMoney(derived.grossPnl) : "—";
      applyValueTone(cash, known && derived ? derived.grossPnl : 0);
    });
    const summary = document.getElementById("partial-exit-summary");
    summary.hidden = planned || !hasValues;
    const write = (name, value) => {
      document.getElementById("partial-exit-" + name).textContent = value;
    };
    write(
      "closed-percent",
      known ? displayNumber(result.closedPercent, 4) + "٪" : "—",
    );
    write(
      "remaining",
      known
        ? displayNumber(result.remainingPercent, 4) +
            "٪ · " +
            displayNumber(result.remainingQuantity, 6) +
            " واحد"
        : "—",
    );
    write("gross", known ? displayMoney(result.grossPnl) : "—");
    write("net", known ? displayMoney(result.netPnlToDate) : "—");
    applyValueTone(
      document.getElementById("partial-exit-gross"),
      known ? result.grossPnl : 0,
    );
    applyValueTone(
      document.getElementById("partial-exit-net"),
      known ? result.netPnlToDate : 0,
    );
    const status = document.getElementById("partial-exit-state");
    status.dataset.invalid = String(!planned && hasValues && !result.valid);
    status.textContent = planned
      ? "خروج واقعی را بعد از باز شدن پوزیشن ثبت کن. ردیف‌های موجود در پیش‌نویس حفظ می‌شوند."
      : hasValues && !result.valid
        ? result.errors?.[0] ||
          "برای پیش‌نمایش خروج پله‌ای، اطلاعات اصلی معامله و پله‌ها را کامل کن."
        : hasValues
          ? "مبنای هر R: " +
            displayMoney(result.baselineRisk) +
            " ریسک اولیهٔ همین پوزیشن. این مبنا هنگام ویرایش معاملهٔ باز یا بسته حفظ می‌شود."
          : "مثال: خروج ۵۰٪ در ۱R و ۲۵٪ در ۲R؛ ۲۵٪ از حجم اولیه باز می‌ماند.";
    return result;
  };
  const markPartialExitErrors = (errors) => {
    const targets = [];
    const rows = partialExitRows();
    errors
      .filter((error) => String(error).includes("پله‌ای"))
      .forEach((error) => {
        const match = /خروج پله‌ای\s+(\d+)\s*:/.exec(
          toEnglishDigits(String(error)),
        );
        const row = match ? rows[Number(match[1]) - 1] : null;
        let field = /درصد|۱۰۰|100|حجم اولیه|مجموع/.test(error)
          ? "percent"
          : /تاریخ/.test(error)
            ? "date"
            : /ساعت/.test(error)
              ? "time"
              : "r";
        let inputs = row
          ? [row.querySelector('[data-partial-field="' + field + '"]')]
          : rows.map((item) =>
              item.querySelector('[data-partial-field="percent"]'),
            );
        if (/وضعیت|برنامه‌ریزی/.test(error)) inputs = [refs.status];
        else if (/کارمزد/.test(error)) inputs = [refs.fees];
        if (!inputs.length)
          inputs = [document.getElementById("add-partial-exit")];
        inputs.forEach((control) => {
          if (!control) return;
          openAccordionFor(control);
          control.setAttribute("aria-invalid", "true");
          const visible = visibleControlFor(control);
          visible.setAttribute("aria-invalid", "true");
          const holder = control.closest(".field") || visible.parentElement;
          let inline = holder.querySelector(".field-error");
          if (!inline) {
            inline = document.createElement("small");
            inline.className = "field-error";
            inline.id = (control.id || "partial-exit") + "-error";
            holder.append(inline);
          }
          inline.textContent = error;
          control.setAttribute("aria-describedby", inline.id);
          visible.setAttribute("aria-describedby", inline.id);
          if (!targets.includes(visible)) targets.push(visible);
        });
      });
    return targets;
  };
  const initializePartialExitEditor = () => {
    const list = document.getElementById("partial-exit-list");
    document
      .getElementById("add-partial-exit")
      .addEventListener("click", () => {
        const row = createPartialExitRow();
        list.append(row);
        renumberPartialExitRows();
        openAccordionFor(row);
        updateRealizedPreview();
        row.querySelector('[data-partial-field="r"]').focus({
          preventScroll: true,
        });
        row.scrollIntoView({
          behavior: scrollBehavior(),
          block: "nearest",
        });
      });
    list.addEventListener("click", (event) => {
      const button = event.target.closest?.("[data-remove-partial-exit]");
      if (!button) return;
      const row = button.closest(".partial-exit-row");
      const next = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      renumberPartialExitRows();
      updateRealizedPreview();
      (
        next?.querySelector('[data-partial-field="r"]') ||
        document.getElementById("add-partial-exit")
      ).focus({
        preventScroll: true,
      });
    });
    updatePartialExitEditor();
  };
  const resetForm = (showNotice = false) => {
    setDraftTradeImages([]);
    setPartialExitsDraft([]);
    setConfirmationValuesDraft([]);
    setTimeframeDirectionsDraft({});
    editingId = null;
    clearFormInvalidState();
    refs.form.reset();
    services.fillEconomics();
    void services.clearDraft();
    refreshAccountUI(defaultNewTradeAccountId());
    syncSettingsUI();
    refreshManagedOptions({
      ...Object.fromEntries(
        Object.entries(OPTION_GROUPS)
          .filter(
            ([group, config]) => config.select && !MULTI_OPTION_FIELDS[group],
          )
          .map(([group, config]) => {
            const first = DEFAULT_OPTIONS[group][0].id;
            return [
              group,
              state.options[group].some(
                (item) => item.id === first && item.active,
              )
                ? first
                : config.fallback,
            ];
          }),
      ),
      ...Object.fromEntries(
        Object.values(MULTI_OPTION_FIELDS).map((plural) => [plural, []]),
      ),
    });
    multiPickerControllers.forEach((controller) => {
      controller.root.open = false;
      controller.search.value = "";
      controller.filter();
    });
    setPersianDateInput(refs.openDate, today());
    setTimeInputValue(refs.openTime, currentTime());
    setPersianDateInput(refs.closeDate, "");
    setTimeInputValue(refs.closeTime, "");
    [
      refs.entry,
      refs.stop,
      refs.target,
      refs.quantity,
      refs.exit,
      refs.maxUnrealizedProfit,
      refs.maxUnrealizedLoss,
    ].forEach((input) => setNumericInputValue(input, ""));
    setNumericInputValue(refs.fees, 0);
    refs.status.value = "open";
    const longRadio = $("input[name='direction'][value='long']", refs.form);
    if (longRadio) longRadio.checked = true;
    renderConfirmationOptions([]);
    refs.formTitle.textContent = "ثبت معامله";
    refs.editBanner.classList.remove("visible");
    refs.cancelEdit.classList.add("is-hidden");
    refs.saveTrade.textContent = "ذخیرهٔ معامله";
    refs.formMessage.classList.remove("visible");
    refs.formMessage.textContent = "";
    $$("[data-accordion]", refs.form).forEach((item) =>
      setAccordion(item, item.dataset.defaultOpen === "true"),
    );
    syncAllListboxes();
    toggleCloseFields();
    updateCalculator();
    loadedEditorRoute = null;
    markEditorClean();
    if (showNotice) showToast("فرم پاک شد.");
  };
  const formValues = () => ({
    ...services.formEconomics(),
    id: editingId || makeId(),
    accountId: $("#trade-account").value,
    status: refs.status.value,
    openDate: readPersianDateInput(refs.openDate),
    openTime: canonicalTime(refs.openTime.value) ?? refs.openTime.value,
    closeDate: readPersianDateInput(refs.closeDate),
    closeTime: canonicalTime(refs.closeTime.value) ?? refs.closeTime.value,
    symbol: refs.symbol.value,
    marketType: refs.marketType.value,
    direction: readDirection(),
    strategy: getSelectedManaged("strategy")[0] || "",
    strategies: getSelectedManaged("strategy"),
    timeframe: getSelectedManaged("timeframe")[0] || "unknown",
    timeframes: getSelectedManaged("timeframe"),
    session: getSelectedManaged("session")[0] || "unknown",
    sessions: getSelectedManaged("session"),
    confirmations: getSelectedConfirmations(),
    timeframeDirections: readTimeframeDirectionsDraft(),
    confirmationValues: readConfirmationValuesDraft(),
    setupQuality: refs.setupQuality.value,
    emotion: getSelectedManaged("emotion")[0] || "unknown",
    emotions: getSelectedManaged("emotion"),
    confidence: refs.confidence.value,
    planFollowed: refs.planFollowed.value,
    mistakeType: getSelectedManaged("mistakeType")[0] || "none",
    mistakeTypes: getSelectedManaged("mistakeType"),
    entry: refs.entry.value,
    stop: refs.stop.value,
    target: refs.target.value,
    quantity: refs.quantity.value,
    exit: refs.exit.value,
    partialExits: readPartialExitsDraft(),
    fees: refs.fees.value,
    maxUnrealizedProfit: refs.maxUnrealizedProfit.value,
    maxUnrealizedLoss: refs.maxUnrealizedLoss.value,
    entryReason: refs.entryReason.value,
    exitReason: refs.exitReason.value,
    lesson: refs.lesson.value,
    screenshotRef: refs.screenshotRef.value,
    images: draftTradeImages.map((image) => ({
      ...image,
    })),
    notes: refs.notes.value,
  });
  const showFormErrors = (errors) => {
    clearFormInvalidState();
    refs.formMessage.textContent = "";
    const list = document.createElement("ul");
    errors.forEach((error) => {
      const item = document.createElement("li");
      item.textContent = error;
      list.appendChild(item);
    });
    refs.formMessage.appendChild(list);
    refs.formMessage.classList.add("visible");
    const targets = [];
    let currentError = "";
    const mark = (controls) =>
      controls.forEach((control) => {
        if (!control) return;
        openAccordionFor(control);
        const visible = visibleControlFor(control);
        if (targets.includes(visible)) return;
        control.setAttribute("aria-invalid", "true");
        visible.setAttribute("aria-invalid", "true");
        const field = control.closest(".field") || control.parentElement;
        let inline = field.querySelector(".field-error");
        if (!inline) {
          inline = makeElement("small", "field-error");
          inline.id = (control.id || "trade-field") + "-error";
          field.appendChild(inline);
        }
        inline.textContent = currentError;
        visible.setAttribute("aria-describedby", inline.id);
        targets.push(visible);
      });
    errors.forEach((error) => {
      currentError = error;
      if (
        error.includes("پله‌ای") ||
        error.includes("تأییدیه") ||
        error.includes("تایم‌فریم")
      )
        return;
      if (error.includes("حساب")) mark([$("#trade-account")]);
      if (error.includes("نماد")) mark([refs.symbol]);
      if (error.includes("قیمت ورود")) mark([refs.entry]);
      if (error.includes("حد ضرر")) mark([refs.stop]);
      if (error.includes("هدف")) mark([refs.target]);
      if (error.includes("حجم")) mark([refs.quantity]);
      if (error.includes("تاریخ ورود")) mark([refs.openDate]);
      if (error.includes("ساعت ورود")) mark([refs.openTime]);
      if (error.includes("تاریخ خروج")) mark([refs.closeDate]);
      if (error.includes("ساعت خروج")) mark([refs.closeTime]);
      if (error.includes("قیمت خروج")) mark([refs.exit]);
      if (error.includes("کارمزد")) mark([refs.fees]);
      if (error.includes("بیشترین سود باز")) mark([refs.maxUnrealizedProfit]);
      if (error.includes("بیشترین زیان باز")) mark([refs.maxUnrealizedLoss]);
      if (error.includes("جهت")) mark($$('input[name="direction"]', refs.form));
      if (error.includes("وضعیت")) mark([refs.status]);
      if (
        error.includes("قیمت‌ها و حجم") ||
        error.includes("لانگ") ||
        error.includes("شورت") ||
        error.includes("مقدار") ||
        error.includes("اعداد نتیجه")
      )
        mark([refs.entry, refs.stop, refs.target, refs.quantity]);
    });
    targets.push(
      ...markContextFieldErrors(errors),
      ...markPartialExitErrors(errors),
    );
    const firstTarget = targets[0] || refs.formMessage;
    const firstSource =
      [...listboxControllers.values()].find(
        (controller) => controller.button === firstTarget,
      )?.select || firstTarget;
    revealConfirmationField(firstSource);
    firstTarget.focus({
      preventScroll: true,
    });
    firstTarget.scrollIntoView({
      behavior: scrollBehavior(),
      block: "center",
    });
  };
  const saveTradeFromForm = async (event) => {
    event.preventDefault();
    const selectedAccount = getAccountById($("#trade-account").value);
    const accountTrade = editingId
      ? state.trades.find((trade) => trade.id === editingId)
      : null;
    if (
      !selectedAccount ||
      (selectedAccount.archived &&
        accountTrade?.accountId !== selectedAccount.id)
    ) {
      showFormErrors([
        "برای این پوزیشن یک حساب فعال انتخاب کن. سابقهٔ حساب بایگانی‌شده را می‌توان در همان حساب ویرایش کرد.",
      ]);
      return;
    }
    if (imageProcessingCount) {
      showToast(
        "تصاویر هنوز آماده نشده‌اند؛ کمی صبر کن و دوباره ذخیره کن.",
        true,
      );
      return;
    }
    refs.formMessage.classList.remove("visible");
    clearFormInvalidState();
    const partialCheck = updatePartialExitEditor();
    const partialPlan = calculatePlan(partialExitEditorInput());
    if (
      !partialCheck.valid &&
      readPartialExitsDraft().length &&
      partialPlan.valid &&
      partialPlan.quantity !== null
    ) {
      showFormErrors(partialCheck.errors);
      return;
    }
    if (!refs.form.checkValidity()) {
      const errors = Array.from(refs.form.elements)
        .filter((input) => input.willValidate && !input.validity.valid)
        .map((input) => input.validationMessage);
      showFormErrors([...new Set(errors)]);
      return;
    }
    const existing = editingId
      ? state.trades.find((trade) => trade.id === editingId)
      : null;
    const raw = {
      ...formValues(),
      createdAt: existing?.createdAt || nowIso(),
      updatedAt: nowIso(),
    };
    if (existing && existing.status !== "planned") {
      raw.plannedRisk = existing.plannedRisk;
      raw.plannedReward = existing.plannedReward;
      raw.plannedRR = existing.plannedRR;
    }
    const result = normalizeTrade(raw, state.options);
    if (!result.trade) {
      showFormErrors(result.errors);
      return;
    }
    const wasEditing = Boolean(existing);
    const nextTrades = wasEditing
      ? state.trades.map((trade) =>
          trade.id === editingId ? result.trade : trade,
        )
      : [...state.trades, result.trade];
    let options = state.options;
    const newSetups = optionTradeValues(result.trade, "strategy").filter(
      (value) => !options.strategy.some((item) => item.id === value),
    );
    if (newSetups.length)
      options = {
        ...options,
        strategy: [
          ...options.strategy,
          ...newSetups.map((value) => ({
            id: value,
            label: value,
            description: "",
            active: true,
          })),
        ],
      };
    if (
      !(await persist({
        ...state,
        options,
        trades: nextTrades,
      }))
    )
      return;
    renderAll();
    resetForm(false);
    showToast(
      wasEditing ? "معامله به‌روزرسانی شد." : "معامله در این مرورگر ذخیره شد.",
    );
    await navigateJournalRoute(tradeDetailHref(result.trade.id));
  };
  const fillForm = (trade, closeMode = false) => {
    trade = services.preciseFormTrade(trade);
    services.fillEconomics(trade);
    setDraftTradeImages(trade.images || []);
    editingId = trade.id;
    setPartialExitsDraft(trade.partialExits || []);
    setConfirmationValuesDraft(trade.confirmationValues || []);
    setTimeframeDirectionsDraft(trade.timeframeDirections || {});
    refreshAccountUI(trade.accountId);
    syncSettingsUI();
    refreshManagedOptions(trade);
    clearFormInvalidState();
    refs.formMessage.classList.remove("visible");
    refs.formMessage.textContent = "";
    setPersianDateInput(refs.openDate, trade.openDate);
    setTimeInputValue(refs.openTime, trade.openTime || "");
    refs.symbol.value = trade.symbol;
    refs.marketType.value = trade.marketType;
    refs.status.value = closeMode ? "closed" : trade.status;
    const direction = $(
      "input[name='direction'][value='" + trade.direction + "']",
      refs.form,
    );
    if (direction) direction.checked = true;
    setNumericInputValue(refs.entry, trade.entry);
    setNumericInputValue(refs.stop, trade.stop);
    setNumericInputValue(refs.target, trade.target);
    setNumericInputValue(refs.quantity, trade.quantity);
    setNumericInputValue(refs.fees, trade.fees);
    setNumericInputValue(
      refs.maxUnrealizedProfit,
      trade.maxUnrealizedProfit ?? "",
    );
    setNumericInputValue(refs.maxUnrealizedLoss, trade.maxUnrealizedLoss ?? "");
    refs.strategy.value = trade.strategy;
    refs.timeframe.value = trade.timeframe;
    refs.session.value = trade.session;
    refs.setupQuality.value = trade.setupQuality ?? "";
    refs.emotion.value = trade.emotion;
    refs.confidence.value = trade.confidence ?? "";
    refs.planFollowed.value = trade.planFollowed;
    refs.mistakeType.value = trade.mistakeType;
    ["marketType", "planFollowed"].forEach(syncSingleManagedDescription);
    renderConfirmationOptions(trade.confirmations || []);
    setPersianDateInput(refs.closeDate, closeMode ? today() : trade.closeDate);
    setTimeInputValue(
      refs.closeTime,
      closeMode ? currentTime() : trade.closeTime,
    );
    setNumericInputValue(refs.exit, closeMode ? "" : (trade.exit ?? ""));
    refs.entryReason.value = trade.entryReason;
    refs.exitReason.value = closeMode ? "" : trade.exitReason;
    refs.lesson.value = closeMode ? "" : trade.lesson;
    refs.screenshotRef.value = trade.screenshotRef;
    refs.notes.value = trade.notes;
    refs.formTitle.textContent = closeMode ? "بستن معامله" : "ویرایش معامله";
    const baselineNote =
      trade.status === "planned"
        ? "مبنای ریسک پیش‌نویس با پلن به‌روز می‌شود"
        : "مبنای ریسک اولیه حفظ می‌شود";
    refs.editBannerText.textContent =
      (closeMode ? "ثبت نتیجهٔ " : "ویرایش ") +
      trade.symbol +
      " · " +
      baselineNote;
    refs.editBanner.classList.add("visible");
    refs.cancelEdit.classList.remove("is-hidden");
    refs.saveTrade.textContent = closeMode ? "ذخیرهٔ نتیجه" : "ذخیرهٔ تغییرات";
    syncAllListboxes();
    toggleCloseFields();
    updateCalculator();
    revealPopulatedEditorSections(trade);
    markEditorClean();
    $("#form-card").scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
    setTimeout(() => {
      if (
        currentView === "editor" &&
        !refs.formMessage.classList.contains("visible") &&
        !refs.form.contains(document.activeElement) &&
        !$("#shell-position-account").contains(document.activeElement) &&
        !document.activeElement?.closest?.(".confirmation-popover-panel")
      )
        (closeMode
          ? refs.exit.disabled
            ? refs.closeDate
            : refs.exit
          : refs.symbol
        ).focus({
          preventScroll: true,
        });
    }, 250);
  };
  const duplicateTrade = async (trade) => {
    if (accountForTrade(trade)?.archived) {
      showToast(
        "برای کپی این پوزیشن، حساب را بازگردان یا یک پوزیشن تازه در حساب فعال بساز.",
        true,
      );
      return;
    }
    const raw = {
      ...services.preciseFormTrade(trade),
      id: makeId(),
      status: "planned",
      openDate: today(),
      openTime: currentTime(),
      closeDate: "",
      closeTime: "",
      exit: null,
      partialExits: [],
      fills: [],
      initialPlan: undefined,
      stop: trade.initialPlan?.stop ?? trade.stop,
      target: trade.initialPlan?.target ?? trade.target,
      maxUnrealizedProfit: null,
      maxUnrealizedLoss: null,
      exitReason: "",
      lesson: "",
      plannedRisk: null,
      plannedReward: null,
      plannedRR: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const result = normalizeTrade(raw, state.options);
    if (!result.trade) {
      showToast("کپی این معامله ممکن نشد.", true);
      return;
    }
    if (
      !(await persist({
        ...state,
        trades: [...state.trades, result.trade],
      }))
    )
      return;
    renderAll();
    showToast("یک نسخهٔ برنامه‌ریزی‌شده از " + trade.symbol + " ساخته شد.");
  };
  const deleteTrade = async (trade) => {
    if (
      !(await services.confirm(
        "معاملهٔ " +
          trade.symbol +
          " در تاریخ " +
          formatDate(trade.openDate) +
          " حذف شود؟ این کار قابل بازگشت نیست.",
      ))
    )
      return;
    const nextTrades = state.trades.filter((item) => item.id !== trade.id);
    if (
      !(await persist({
        ...state,
        trades: nextTrades,
      }))
    )
      return;
    if (editingId === trade.id) resetForm(false);
    renderAll();
    showToast("معامله حذف شد.");
  };
  const getOutcome = (trade) =>
    trade.status === "closed" ? calculateClosed(trade).outcome : null;
  let filteredCacheRevision = -1;
  const filteredCache = new Map();
  const getFilteredTrades = ({ ignoreAccount = false } = {}) => {
    if (filteredCacheRevision !== services.state.revision) {
      filteredCache.clear();
      filteredCacheRevision = services.state.revision;
    }
    const cacheKey = filterFingerprint() + ":" + ignoreAccount;
    if (filteredCache.has(cacheKey)) return filteredCache.get(cacheKey);
    const search = refs.filterSymbol.value.trim().toUpperCase();
    const direction = refs.filterDirection.value;
    const status = refs.filterStatus.value;
    const session = refs.filterSession.value;
    const confirmations = [...selectedFactorConfirmations];
    const confirmationMode = refs.filterConfirmationMode.value;
    const touchedRMinimum = $("#filter-touched-r-min").value;
    const factorFilters = readFactorFilters();
    const from = parsePersianDate(refs.filterFrom.value) || "";
    const to = parsePersianDate(refs.filterTo.value) || "";
    setAriaInvalid(refs.filterFrom, Boolean(refs.filterFrom.value && !from));
    setAriaInvalid(refs.filterTo, Boolean(refs.filterTo.value && !to));
    const result = state.trades
      .filter(
        (trade) =>
          ignoreAccount ||
          !activeAccountScope ||
          trade.accountId === activeAccountScope,
      )
      .filter((trade) =>
        exactFactorSymbol !== null
          ? trade.symbol === exactFactorSymbol
          : matchesTradeSearch(trade, search),
      )
      .filter((trade) => direction === "all" || trade.direction === direction)
      .filter(
        (trade) =>
          session === "all" || matchesFactorValue(trade, "session", session),
      )
      .filter((trade) =>
        matchesConfirmationFilter(trade, confirmations, confirmationMode),
      )
      .filter(
        (trade) =>
          touchedRMinimum === "" || hasTouchedR(trade, Number(touchedRMinimum)),
      )
      .filter((trade) =>
        Object.entries(factorFilters).every(([key, value]) =>
          matchesFactorValue(trade, key, value),
        ),
      )
      .filter((trade) => {
        if (status === "all") return true;
        if (["planned", "open", "closed"].includes(status))
          return trade.status === status;
        return trade.status === "closed" && getOutcome(trade) === status;
      })
      .filter((trade) => !from || trade.openDate >= from)
      .filter((trade) => !to || trade.openDate <= to)
      .sort(
        (a, b) =>
          b.openDate.localeCompare(a.openDate) ||
          (b.openTime || "").localeCompare(a.openTime || "") ||
          b.createdAt.localeCompare(a.createdAt),
      );
    if (filteredCache.size >= 64)
      filteredCache.delete(filteredCache.keys().next().value);
    filteredCache.set(cacheKey, result);
    return result;
  };
  const average = (values) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  const applyValueTone = (element, value) => {
    element.classList.remove("positive", "negative");
    if (value > 0) element.classList.add("positive");
    if (value < 0) element.classList.add("negative");
  };
  const renderMetrics = (trades, report = null) => {
    const byId = report
      ? new Map(trades.map((trade) => [trade.id, trade]))
      : null;
    const closed = report
      ? report.closed.map((item) => ({
          ...item,
          netPnl: Number(item.netPnl),
          realizedR: Number(item.realizedR),
          trade: byId.get(item.id),
          valid: true,
        }))
      : trades
          .filter((trade) => trade.status === "closed")
          .map((trade) => {
            const result = calculateClosed(trade);
            return {
              trade,
              ...result,
            };
          })
          .filter((item) => item.valid);
    const wins = closed.filter((item) => item.outcome === "win");
    const losses = closed.filter((item) => item.outcome === "loss");
    const breakevens = closed.filter((item) => item.outcome === "breakeven");
    const openCount = trades.filter((trade) => trade.status === "open").length;
    const decided = wins.length + losses.length;
    const winRate = decided ? (wins.length / decided) * 100 : null;
    const netByCurrency = report
      ? report.currencies
      : services.currencyTotals(closed);
    const netCurrencies = Object.keys(netByCurrency);
    const net =
      netCurrencies.length <= 1
        ? Number(Object.values(netByCurrency)[0] || 0)
        : null;
    const avgPlanned = average(closed.map((item) => item.trade.plannedRR));
    const avgRealized = average(closed.map((item) => item.realizedR));
    const expectancy = average(closed.map((item) => item.realizedR));
    const grossWins = wins.reduce((sum, item) => sum + item.netPnl, 0);
    const grossLosses = Math.abs(
      losses.reduce((sum, item) => sum + item.netPnl, 0),
    );
    const profitFactor =
      netCurrencies.length < 2 && grossLosses > 0
        ? grossWins / grossLosses
        : null;
    $("#metric-closed").textContent = displayNumber(closed.length);
    $("#metric-open").textContent = displayNumber(openCount);
    $("#metric-winrate").textContent =
      winRate === null ? "—" : displayNumber(winRate, 1) + "٪";
    $("#metric-record").textContent =
      displayNumber(wins.length) +
      " برد · " +
      displayNumber(losses.length) +
      " باخت · " +
      displayNumber(breakevens.length) +
      " سربه‌سر";
    $("#metric-net").textContent =
      Object.entries(netByCurrency)
        .map(([currency, value]) => displayMoney(Number(value), currency))
        .join(" · ") || displayMoney(0);
    $("#metric-planned").textContent = displayRR(avgPlanned);
    $("#metric-realized").textContent = displayR(avgRealized);
    $("#metric-expectancy").textContent = displayR(expectancy);
    $("#metric-profit-factor").textContent =
      profitFactor === null ? "—" : displayNumber(profitFactor, 2);
    $("#metric-breakeven").textContent = displayNumber(breakevens.length);
    applyValueTone($("#metric-net"), net);
    applyValueTone($("#metric-realized"), avgRealized ?? 0);
    applyValueTone($("#metric-expectancy"), expectancy ?? 0);
    const activeFilters = hasActiveFactorFilters();
    $("#metric-context").textContent =
      (activeAccountScope ? accountName(activeAccountScope) : "همهٔ حساب‌ها") +
      " · " +
      displayNumber(trades.length) +
      " پوزیشن" +
      (activeFilters
        ? " · سایر فیلترها اعمال شده‌اند"
        : " · عملکرد از معاملات بسته");
    $("#metric-live").textContent =
      displayNumber(closed.length) +
      " معاملهٔ بسته. " +
      (winRate === null
        ? "نرخ برد در دسترس نیست. "
        : "نرخ برد " + displayNumber(winRate, 1) + " درصد. ") +
      "سود و زیان خالص " +
      displayMoney(net) +
      ". امید ریاضی " +
      displayR(expectancy) +
      ".";
  };
  const closedResults = (trades) =>
    trades
      .filter((trade) => trade.status === "closed")
      .map((trade) => ({
        trade,
        ...calculateClosed(trade),
      }))
      .filter((item) => item.valid);
  const weekdayKey = (date) => {
    if (!validDate(date)) return "unknown";
    const [year, month, day] = date.split("-").map(Number);
    return String(new Date(Date.UTC(year, month - 1, day)).getUTCDay());
  };
  const timeBucketKey = (time) => {
    if (!validTime(time)) return "unknown";
    const hour = Number(time.slice(0, 2));
    if (hour < 6) return "dawn";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };
  const tradeDurationMinutes = (trade) => {
    if (
      !validDate(trade.openDate) ||
      !validDate(trade.closeDate) ||
      !validTime(trade.openTime) ||
      !validTime(trade.closeTime)
    )
      return null;
    const toUtc = (date, time) => {
      const [year, month, day] = date.split("-").map(Number);
      const [hour, minute] = time.split(":").map(Number);
      return Date.UTC(year, month - 1, day, hour, minute);
    };
    const minutes =
      (toUtc(trade.closeDate, trade.closeTime) -
        toUtc(trade.openDate, trade.openTime)) /
      60000;
    return Number.isFinite(minutes) && minutes >= 0 ? minutes : null;
  };
  const displayDuration = (minutes) => {
    if (minutes === null) return "مدت ثبت نشده";
    if (minutes < 60) return displayNumber(minutes, 0) + " دقیقه";
    if (minutes < 1440) return displayNumber(minutes / 60, 1) + " ساعت";
    return displayNumber(minutes / 1440, 1) + " روز";
  };
  function summarizePerformance(items) {
    const netByCurrency = services.currencyTotals(items);
    const mixedCurrency = Object.keys(netByCurrency).length > 1;
    const wins = items.filter((item) => item.outcome === "win").length;
    const losses = items.filter((item) => item.outcome === "loss").length;
    const breakevens = items.filter(
      (item) => item.outcome === "breakeven",
    ).length;
    const profits = items
      .map((item) => item.trade.maxUnrealizedProfit)
      .filter(Number.isFinite);
    const adverse = items
      .map((item) => item.trade.maxUnrealizedLoss)
      .filter(Number.isFinite);
    const touchedR = items
      .map((item) => calculateMaxTouchedR(item.trade))
      .filter(Number.isFinite);
    return {
      count: items.length,
      decided: wins + losses,
      wins,
      losses,
      breakevens,
      winRate: wins + losses ? (wins / (wins + losses)) * 100 : null,
      avgPlannedRR: average(
        items.map((item) => item.trade.plannedRR).filter(Number.isFinite),
      ),
      avgR: average(
        items.map((item) => item.realizedR).filter(Number.isFinite),
      ),
      net: mixedCurrency ? null : Number(Object.values(netByCurrency)[0] || 0),
      netByCurrency,
      avgMaxUnrealizedProfit: mixedCurrency ? null : average(profits),
      profitKnown: profits.length,
      avgMaxUnrealizedLoss: mixedCurrency ? null : average(adverse),
      lossKnown: adverse.length,
      avgMaxTouchedR: average(touchedR),
      maxTouchedR: touchedR.length
        ? touchedR.reduce((largest, value) => Math.max(largest, value), 0)
        : null,
      touchedRKnown: touchedR.length,
    };
  }
  const renderFilteredSummary = (trades) => {
    const summary = summarizePerformance(closedResults(trades));
    const container = $("#factor-summary");
    container.replaceChildren();
    const cards = [
      [
        "معاملات بستهٔ فیلترشده",
        displayNumber(summary.count),
        displayNumber(summary.wins) +
          " برد · " +
          displayNumber(summary.losses) +
          " باخت · " +
          displayNumber(summary.breakevens) +
          " سربه‌سر",
      ],
      [
        "نرخ برد",
        summary.winRate === null
          ? "—"
          : displayNumber(summary.winRate, 1) + "٪",
        "برد ÷ (برد + باخت)؛ بدون سربه‌سر",
      ],
      [
        "میانگین R/R برنامه",
        displayRR(summary.avgPlannedRR),
        "نسبت ثبت‌شده در پلن اولیه",
      ],
      ["میانگین R واقعی", displayR(summary.avgR), "خالص کارمزد؛ شامل سربه‌سر"],
      [
        "P&L محقق‌شدهٔ خالص",
        displayMoney(summary.net),
        "جمع نتیجهٔ بسته‌ها؛ پس از کارمزد",
      ],
      [
        "میانگین اوج سود باز (MFE)",
        displayMoney(summary.avgMaxUnrealizedProfit),
        displayNumber(summary.profitKnown) +
          " از " +
          displayNumber(summary.count) +
          " بسته · ناخالص",
      ],
      [
        "میانگین بیشترین زیان باز (MAE)",
        displayMoney(summary.avgMaxUnrealizedLoss),
        displayNumber(summary.lossKnown) +
          " از " +
          displayNumber(summary.count) +
          " بسته · قدرمطلق",
      ],
      [
        "باز / پیش‌نویس",
        displayNumber(trades.filter((t) => t.status === "open").length) +
          " / " +
          displayNumber(trades.filter((t) => t.status === "planned").length),
        "در نرخ برد و میانگین‌های بالا نیستند",
      ],
      [
        "میانگین بیشترین R لمس‌شده",
        displayR(summary.avgMaxTouchedR),
        displayNumber(summary.touchedRKnown) +
          " از " +
          displayNumber(summary.count) +
          " بسته · اوج سود باز ÷ ریسک اولیه",
      ],
      [
        "بالاترین R لمس‌شده",
        displayR(summary.maxTouchedR),
        "بیشترین مقدار ثبت‌شده در بسته‌های همین فیلتر · ناخالص",
      ],
    ];
    cards.forEach(([label, value, note], index) => {
      const card = makeElement(
        "article",
        "factor-stat" + (index >= 8 ? " peak-r-stat" : ""),
      );
      card.append(
        makeElement("span", "", label),
        makeElement("strong", "", value),
        makeElement("small", "", note),
      );
      container.appendChild(card);
    });
    const context = $("#factor-summary-context");
    const outcomeActive = ["win", "loss", "breakeven"].includes(
      refs.filterStatus.value,
    );
    const selected = [...selectedFactorConfirmations];
    const mode = refs.filterConfirmationMode.value;
    const modeLabels = {
      all: "همهٔ",
      any: "حداقل یکی از",
      none: "بدون",
    };
    const confirmationNote =
      mode === "empty"
        ? " · بدون هیچ تأییدیه"
        : selected.length
          ? " · " + modeLabels[mode] + " [" + selected.join("، ") + "]"
          : "";
    context.textContent =
      displayNumber(trades.length) +
      " معامله در این فیلتر؛ معیارهای عملکرد فقط از بسته‌ها" +
      confirmationNote +
      (exactFactorSymbol !== null ? " · نماد دقیق: " + exactFactorSymbol : "") +
      " · مقدار خالی MFE/MAE ناشناخته است و صفر حساب نمی‌شود." +
      (summary.count > 0 && summary.count < 10
        ? " نمونهٔ کم؛ نتیجه قطعی نیست."
        : "") +
      (outcomeActive
        ? " فیلتر نتیجه فعال است؛ نرخ برد ۱۰۰٪ یا ۰٪ در این حالت اثر انتخاب برد/باخت است."
        : "");
    context.classList.toggle(
      "factor-warning",
      outcomeActive || (summary.count > 0 && summary.count < 10),
    );
    container.dataset.summary = JSON.stringify(summary);
  };
  const summarizeGroups = (items, keyGetter, labelGetter = (key) => key) => {
    const groups = new Map();
    items.forEach((item) => {
      const rawKeys = keyGetter(item);
      const keys = Array.isArray(rawKeys) ? rawKeys : [rawKeys];
      [
        ...new Set(
          keys.filter((key) => key !== null && key !== undefined && key !== ""),
        ),
      ].forEach((key) => {
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      });
    });
    return [...groups.entries()]
      .map(([key, values]) => {
        return {
          key,
          label: labelGetter(key),
          ...summarizePerformance(values),
        };
      })
      .sort(
        (a, b) =>
          b.count - a.count ||
          (b.winRate ?? -1) - (a.winRate ?? -1) ||
          a.label.localeCompare(b.label, "fa"),
      );
  };
  const analyticsGroupsFor = (items, mode) => {
    if (mode === "maxTouchedR")
      return summarizeGroups(
        items,
        (item) => factorValues(item.trade, mode),
        (key) => factorLabel(mode, key),
      );
    if (mode === "confirmations") {
      return summarizeGroups(
        items,
        (item) =>
          item.trade.confirmations?.length
            ? item.trade.confirmations
            : ["بدون تأییدیه"],
        (key) => key,
      );
    }
    if (Object.hasOwn(MULTI_OPTION_FIELDS, mode))
      return summarizeGroups(
        items,
        (item) => factorValues(item.trade, mode),
        (key) => factorLabel(mode, key),
      );
    if (mode === "weekday")
      return summarizeGroups(
        items,
        (item) => weekdayKey(item.trade.openDate),
        (key) =>
          key === "unknown" ? "تاریخ ثبت نشده" : WEEKDAY_LABELS[Number(key)],
      );
    if (mode === "weekpart") {
      return summarizeGroups(
        items,
        (item) => classifyWeekpart(item.trade.openDate),
        (key) =>
          key === "unknown"
            ? "تاریخ ثبت نشده"
            : key === "weekend"
              ? weekendGroupLabel(state.settings.weekendDays)
              : "روزهای کاری",
      );
    }
    if (mode === "timebucket")
      return summarizeGroups(
        items,
        (item) => timeBucketKey(item.trade.openTime),
        (key) => labelFor("timebucket", key),
      );
    const configs = {
      strategy: [
        (item) => factorValues(item.trade, "strategy"),
        (key) => factorLabel("strategy", key),
      ],
      symbol: [(item) => item.trade.symbol || "ثبت نشده", (key) => key],
      planFollowed: [
        (item) => item.trade.planFollowed || "unknown",
        (key) => labelFor("planFollowed", key),
      ],
      setupQuality: [
        (item) =>
          item.trade.setupQuality ? String(item.trade.setupQuality) : "unknown",
        (key) => labelFor("setupQuality", key),
      ],
      confidence: [
        (item) =>
          item.trade.confidence ? String(item.trade.confidence) : "unknown",
        (key) => factorLabel("confidence", key),
      ],
      direction: [
        (item) => item.trade.direction,
        (key) => labelFor("direction", key),
      ],
      marketType: [
        (item) => item.trade.marketType || "other",
        (key) => labelFor("marketType", key),
      ],
    };
    const config = configs[mode] || configs.strategy;
    return summarizeGroups(items, config[0], config[1]);
  };
  const groupedChoicesOverlap = (mode) =>
    mode === "confirmations" || Object.hasOwn(MULTI_OPTION_FIELDS, mode);
  const groupedChoicesNote =
    "هر معامله در گروهِ هر گزینهٔ انتخاب‌شده شمرده می‌شود؛ جمع تعداد گروه‌ها ممکن است از تعداد معاملات بیشتر باشد. جمع کل هر معامله را فقط یک‌بار حساب می‌کند.";
  const renderBreakdown = (container, groups, mode = "") => {
    container.textContent = "";
    if (!groups.length) {
      container.appendChild(
        makeElement(
          "div",
          "analysis-empty",
          "برای این تحلیل هنوز معاملهٔ بستهٔ کافی ثبت نشده است.",
        ),
      );
      return;
    }
    if (groupedChoicesOverlap(mode))
      container.appendChild(
        makeElement("p", "factor-help", groupedChoicesNote),
      );
    groups.forEach((group) => {
      const row = makeElement("div", "analysis-row");
      const name = makeElement("div", "analysis-name");
      name.appendChild(makeElement("strong", "", group.label));
      const sample =
        displayNumber(group.count) +
        " معامله · " +
        displayNumber(group.wins) +
        " برد / " +
        displayNumber(group.losses) +
        " باخت / " +
        displayNumber(group.breakevens) +
        " سربه‌سر" +
        (group.count < 5 ? " · نمونه کم" : "");
      name.appendChild(makeElement("span", "", sample));
      const visual = makeElement("div", "analysis-track");
      const fill = document.createElement("span");
      fill.style.width = Math.max(0, Math.min(100, group.winRate ?? 0)) + "%";
      visual.appendChild(fill);
      const stats = makeElement("div", "analysis-stats");
      stats.appendChild(
        makeElement(
          "strong",
          "",
          group.winRate === null ? "—" : displayNumber(group.winRate, 1) + "٪",
        ),
      );
      stats.appendChild(
        makeElement(
          "span",
          "",
          "R/R " +
            displayNumber(group.avgPlannedRR, 2) +
            " · R واقعی " +
            displayR(group.avgR),
        ),
      );
      stats.appendChild(
        makeElement("span", "", "خالص " + displayMoney(group.net)),
      );
      row.append(name, visual, stats);
      container.appendChild(row);
    });
  };
  const bestGroup = (groups) =>
    groups
      .filter((group) => group.decided >= 2 && group.winRate !== null)
      .sort(
        (a, b) =>
          b.winRate - a.winRate ||
          (b.avgR ?? -Infinity) - (a.avgR ?? -Infinity) ||
          b.count - a.count,
      )[0] || null;
  const renderInsights = (
    confirmationGroups,
    sessionGroups,
    dayGroups,
    items,
  ) => {
    const container = $("#insight-grid");
    container.textContent = "";
    const bestConfirmation = bestGroup(
      confirmationGroups.filter((group) => group.key !== "بدون تأییدیه"),
    );
    const bestSession = bestGroup(
      sessionGroups.filter((group) => group.key !== "unknown"),
    );
    const bestDay = bestGroup(dayGroups);
    const followed = items.filter((item) => item.trade.planFollowed === "yes");
    const followedDecided = followed.filter(
      (item) => item.outcome !== "breakeven",
    );
    const followedWinRate =
      followedDecided.length >= 2
        ? (followedDecided.filter((item) => item.outcome === "win").length /
            followedDecided.length) *
          100
        : null;
    const decidedSample = (group) =>
      displayNumber(group.decided) +
      " نتیجهٔ قطعی" +
      (group.breakevens
        ? " + " + displayNumber(group.breakevens) + " سربه‌سر"
        : "");
    const cards = [
      [
        "بالاترین نرخ برد مشاهده‌شده",
        bestConfirmation
          ? bestConfirmation.label +
            " با نرخ برد " +
            displayNumber(bestConfirmation.winRate, 1) +
            "٪ از " +
            decidedSample(bestConfirmation) +
            (bestConfirmation.count < 10 ? " · نمونه کم" : "")
          : "حداقل دو نتیجهٔ قطعی با یک تأییدیهٔ مشترک لازم است.",
      ],
      [
        "زمان با بالاترین نرخ برد مشاهده‌شده",
        bestSession
          ? bestSession.label +
            " · " +
            displayNumber(bestSession.winRate, 1) +
            "٪ · میانگین " +
            displayR(bestSession.avgR) +
            " · " +
            decidedSample(bestSession) +
            (bestSession.count < 10 ? " · نمونه کم" : "")
          : bestDay
            ? bestDay.label +
              " · " +
              displayNumber(bestDay.winRate, 1) +
              "٪ · میانگین " +
              displayR(bestDay.avgR) +
              " · " +
              decidedSample(bestDay) +
              (bestDay.count < 10 ? " · نمونه کم" : "")
            : "برای مقایسهٔ زمان‌ها دادهٔ بیشتری ثبت کن.",
      ],
      [
        "اثر اجرای پلن",
        followedWinRate === null
          ? "حداقل دو معاملهٔ برد یا باختِ پایبند به پلن لازم است."
          : "نرخ برد معاملات کاملاً مطابق پلن: " +
            displayNumber(followedWinRate, 1) +
            "٪ از " +
            displayNumber(followedDecided.length) +
            " نتیجهٔ قطعی" +
            (followed.length > followedDecided.length
              ? " + " +
                displayNumber(followed.length - followedDecided.length) +
                " سربه‌سر"
              : ""),
      ],
    ];
    cards.forEach(([title, body]) => {
      const card = makeElement("article", "insight-card");
      card.appendChild(makeElement("span", "", title));
      card.appendChild(makeElement("strong", "", body));
      container.appendChild(card);
    });
  };
  const filterAnalysisGroup = (mode, key, absent = false) => {
    if (mode === "confirmations") {
      selectedFactorConfirmations.clear();
      if (key !== "بدون تأییدیه") selectedFactorConfirmations.add(key);
      refs.filterConfirmationMode.value =
        key === "بدون تأییدیه" ? "empty" : absent ? "none" : "all";
      $("#confirmation-filter-details").open = true;
    } else if (mode === "direction") refs.filterDirection.value = key;
    else if (mode === "session") refs.filterSession.value = key;
    else if (mode === "symbol") {
      exactFactorSymbol = key;
      refs.filterSymbol.value = key;
    } else if ($("#factor-" + mode)) {
      $("#factor-" + mode).value = JSON.stringify(
        key === "ثبت نشده" ? "unknown" : key,
      );
      $("#other-factor-details").open = true;
    }
    syncAllListboxes();
    renderAll();
    revealReportFilters();
    $("#shared-trade-filters").scrollIntoView({
      behavior: scrollBehavior(),
      block: "start",
    });
  };
  const renderAnalysisTable = (groups, closedCount) => {
    refs.analysisTableRows.textContent = "";
    const modeLabel =
      refs.analysisTableMode.selectedOptions[0]?.textContent || "گروه انتخابی";
    const overlapNote = groupedChoicesOverlap(refs.analysisTableMode.value)
      ? " · هر معامله در همهٔ گزینه‌های انتخاب‌شده حضور دارد؛ جمع گروه‌ها ممکن است هم‌پوشانی داشته باشد"
      : "";
    refs.analysisTableSummary.textContent = closedCount
      ? displayNumber(groups.length) +
        " گروه بر اساس «" +
        modeLabel +
        "» از " +
        displayNumber(closedCount) +
        " معاملهٔ بسته" +
        overlapNote +
        " · نرخ برد بدون سربه‌سر"
      : "برای دیدن نرخ برد و R/R، دست‌کم یک معامله را با قیمت خروج ببند.";
    if (!groups.length) {
      const row = document.createElement("tr");
      const cell = makeElement(
        "td",
        "empty-state",
        "هنوز معاملهٔ بسته‌ای برای ساخت این جدول وجود ندارد.",
      );
      cell.colSpan = 13;
      row.appendChild(cell);
      refs.analysisTableRows.appendChild(row);
      return;
    }
    groups.forEach((group) => {
      const row = document.createElement("tr");
      const groupCell = document.createElement("td");
      groupCell.appendChild(makeElement("span", "cell-primary", group.label));
      if (group.count < 5)
        groupCell.appendChild(
          makeElement(
            "span",
            "cell-secondary",
            "نمونهٔ کم؛ با احتیاط تفسیر شود",
          ),
        );
      row.appendChild(groupCell);
      [group.count, group.wins, group.losses, group.breakevens].forEach(
        (value) =>
          row.appendChild(makeElement("td", "mono", displayNumber(value))),
      );
      row.appendChild(
        makeElement(
          "td",
          "mono",
          group.winRate === null ? "—" : displayNumber(group.winRate, 1) + "٪",
        ),
      );
      row.appendChild(makeElement("td", "mono", displayRR(group.avgPlannedRR)));
      const touchedCell = makeElement("td", "mono");
      touchedCell.append(
        makeElement("span", "cell-primary", displayR(group.avgMaxTouchedR)),
        makeElement(
          "span",
          "cell-secondary",
          displayNumber(group.touchedRKnown) + " مقدار ثبت‌شده",
        ),
      );
      row.appendChild(touchedCell);
      const realizedCell = makeElement(
        "td",
        "mono " +
          (group.avgR > 0 ? "positive" : group.avgR < 0 ? "negative" : ""),
        displayR(group.avgR),
      );
      row.appendChild(realizedCell);
      const netCell = makeElement(
        "td",
        "mono " +
          (group.net > 0 ? "positive" : group.net < 0 ? "negative" : ""),
        displayMoney(group.net),
      );
      row.appendChild(netCell);
      [
        [group.avgMaxUnrealizedProfit, group.profitKnown],
        [group.avgMaxUnrealizedLoss, group.lossKnown],
      ].forEach(([value, known]) => {
        const cell = makeElement("td", "mono");
        cell.append(
          makeElement("span", "cell-primary", displayMoney(value)),
          makeElement(
            "span",
            "cell-secondary",
            displayNumber(known) + " مقدار ثبت‌شده",
          ),
        );
        row.appendChild(cell);
      });
      const actionCell = document.createElement("td");
      const actions = makeElement("div", "factor-row-actions");
      const filter = optionButton("فیلتر", () =>
        filterAnalysisGroup(refs.analysisTableMode.value, group.key),
      );
      filter.setAttribute("aria-label", "فیلتر گروه " + group.label);
      actions.appendChild(filter);
      if (
        refs.analysisTableMode.value === "confirmations" &&
        group.key !== "بدون تأییدیه"
      ) {
        const without = optionButton("بدون این", () =>
          filterAnalysisGroup("confirmations", group.key, true),
        );
        without.setAttribute("aria-label", "فیلتر بدون " + group.label);
        actions.appendChild(without);
      }
      actionCell.appendChild(actions);
      row.appendChild(actionCell);
      refs.analysisTableRows.appendChild(row);
    });
  };
  const renderAnalytics = (trades) => {
    const items = closedResults(trades);
    const confirmationGroups = analyticsGroupsFor(items, "confirmations");
    const sessionGroups = analyticsGroupsFor(items, "session");
    const dayGroups = analyticsGroupsFor(items, "weekday");
    renderBreakdown(
      $("#analysis-confirmations"),
      confirmationGroups,
      "confirmations",
    );
    renderBreakdown($("#analysis-sessions"), sessionGroups, "session");
    const timeMode = refs.timeAnalysisMode.value;
    const timeGroups =
      timeMode === "weekday" ? dayGroups : analyticsGroupsFor(items, timeMode);
    renderBreakdown($("#analysis-time"), timeGroups, timeMode);
    const behaviorMode = refs.behaviorAnalysisMode.value;
    renderBreakdown(
      $("#analysis-behavior"),
      analyticsGroupsFor(items, behaviorMode),
      behaviorMode,
    );
    renderAnalysisTable(
      analyticsGroupsFor(items, refs.analysisTableMode.value),
      items.length,
    );
    renderInsights(confirmationGroups, sessionGroups, dayGroups, items);
  };
  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const listboxControllers = new Map();
  const dateControllers = new Map();
  let openListboxController = null;
  let openDateController = null;
  const setNumericInputValue = (input, value) => {
    if (!input) return;
    input.value = formatEditableNumber(value);
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  };
  const localizeNumericInput = (input) => {
    const start = input.selectionStart;
    const localizedPrefix =
      start === null ? null : formatEditableNumber(input.value.slice(0, start));
    input.value = formatEditableNumber(input.value);
    if (localizedPrefix !== null && document.activeElement === input)
      input.setSelectionRange(localizedPrefix.length, localizedPrefix.length);
    const number = finiteNumber(input.value);
    let message = "";
    if (input.value !== "" && number === null) message = "عدد معتبر وارد کن.";
    const positiveIds = new Set([
      "account-balance",
      "fixed-risk",
      "entry",
      "stop",
      "target",
      "quantity",
      "exit",
      "projection-balance",
    ]);
    if (
      !message &&
      input.value !== "" &&
      positiveIds.has(input.id) &&
      number <= 0 &&
      !(
        services.formEconomics().instrument?.signedPrices &&
        ["entry", "stop", "target", "exit"].includes(input.id)
      )
    )
      message = "مقدار باید بزرگ‌تر از صفر باشد.";
    if (
      !message &&
      input.id === "risk-percent" &&
      input.value !== "" &&
      (number <= 0 || number > 100)
    )
      message = "درصد ریسک باید بیشتر از صفر و حداکثر ۱۰۰ باشد.";
    if (!message && input.id === "fees" && input.value !== "" && number < 0)
      message = "کارمزد نمی‌تواند منفی باشد.";
    if (
      !message &&
      ["max-unrealized-profit", "max-unrealized-loss"].includes(input.id) &&
      input.value !== "" &&
      number < 0
    )
      message = "مبلغ بیشترین سود یا زیان باز باید صفر یا مثبت باشد.";
    if (
      !message &&
      input.id === "projection-trades" &&
      input.value !== "" &&
      (!Number.isInteger(number) || number < 1 || number > 1000)
    )
      message = "تعداد معاملات باید عدد صحیح بین ۱ تا ۱۰۰۰ باشد.";
    if (
      !message &&
      input.id === "projection-risk" &&
      input.value !== "" &&
      (number < 0.01 || number > 20)
    )
      message = "ریسک هر معامله باید بین ۰٫۰۱ تا ۲۰ درصد باشد.";
    input.setCustomValidity(message);
    setAriaInvalid(input, Boolean(message));
  };
  const setTimeInputValue = (input, value) => {
    if (!input) return;
    input.value = value ? formatPersianTime(value) : "";
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  };
  const localizeTimeInput = (input) => {
    const start = input.selectionStart;
    const transform = (value) =>
      toPersianDigits(
        toEnglishDigits(value).replace(/[٫.]/g, ":").replace(/\s/g, ""),
      );
    const prefix =
      start === null ? null : transform(input.value.slice(0, start));
    input.value = transform(input.value).slice(0, 5);
    if (prefix !== null && document.activeElement === input)
      input.setSelectionRange(
        Math.min(prefix.length, input.value.length),
        Math.min(prefix.length, input.value.length),
      );
    const normalized = canonicalTime(input.value);
    const valid = input.value === "" || normalized !== null;
    input.setCustomValidity(valid ? "" : "ساعت را مانند ۱۴:۳۰ وارد کن.");
    setAriaInvalid(input, !valid);
  };
  const initializeLocalizedInputs = () => {
    $$("[data-localized-number]").forEach((input) => {
      setNumericInputValue(input, input.value);
      input.addEventListener("input", () => localizeNumericInput(input));
      input.addEventListener("blur", () => localizeNumericInput(input));
    });
    $$("[data-persian-time]").forEach((input) => {
      setTimeInputValue(input, input.value);
      input.addEventListener("input", () => localizeTimeInput(input));
      input.addEventListener("blur", () => {
        const normalized = canonicalTime(input.value);
        if (normalized) setTimeInputValue(input, normalized);
        else localizeTimeInput(input);
      });
    });
  };

  // Read-only chart adapter. Reuse the journal's financial math and report population.
  const WIN_RATE_CHART_FACTORS = [
    ["strategy", "ستاپ‌ها", true],
    ["confirmations", "تأییدیه‌ها", true],
    ["session", "سشن معاملاتی", true],
    ["timeframe", "تایم‌فریم", true],
    ["emotion", "حالت ذهنی", true],
    ["planFollowed", "پایبندی به پلن", false],
    ["marketType", "بازار", false],
    ["direction", "جهت معامله", false],
    ["mistakeType", "اشتباه‌ها", true],
    ["setupQuality", "کیفیت ستاپ", false],
    ["confidence", "اعتماد به ستاپ", false],
    ["maxTouchedR", "بیشترین R لمس‌شده", false],
    ["symbol", "نماد", false],
    ["account", "حساب", false],
  ];
  function buildWinRateChartData(trades, calendar = "jalali") {
    const items = closedResults(trades);
    const fixedGroups = (keys, keyFor, labelForKey) => {
      const bins = new Map(keys.map((key) => [String(key), []]));
      const unknown = [];
      items.forEach((item) => {
        const key = keyFor(item.trade);
        if (key === null || key === undefined || !bins.has(String(key)))
          unknown.push(item);
        else bins.get(String(key)).push(item);
      });
      return {
        groups: keys.map((key) => ({
          key: String(key),
          label: labelForKey(key),
          ...summarizePerformance(bins.get(String(key))),
        })),
        unknown: {
          key: "unknown",
          label: "ثبت نشده / نامعتبر",
          ...summarizePerformance(unknown),
        },
      };
    };
    const hours = fixedGroups(
      Array.from(
        {
          length: 24,
        },
        (_, index) => index,
      ),
      (trade) => {
        const normalized = canonicalTime(trade.openTime);
        return normalized ? Number(normalized.slice(0, 2)) : null;
      },
      (hour) => displayNumber(hour, 0).padStart(2, "۰") + ":۰۰",
    );
    const weekdays = fixedGroups(
      [6, 0, 1, 2, 3, 4, 5],
      (trade) => {
        const key = weekdayKey(trade.openDate);
        return key === "unknown" ? null : Number(key);
      },
      (day) => WEEKDAY_LABELS[day],
    );
    const monthDays = {};
    ["jalali", "gregorian"].forEach((mode) => {
      monthDays[mode] = fixedGroups(
        Array.from(
          {
            length: 31,
          },
          (_, index) => index + 1,
        ),
        (trade) => {
          if (!validDate(trade.openDate)) return null;
          return mode === "jalali"
            ? gregorianToJalali(trade.openDate)?.day
            : Number(trade.openDate.slice(-2));
        },
        (day) => displayNumber(day, 0),
      );
    });
    const factors = Object.fromEntries(
      WIN_RATE_CHART_FACTORS.map(([key, label, overlapping]) => {
        const groups =
          key === "account"
            ? summarizeGroups(
                items,
                (item) => item.trade.accountId || "unknown",
                (id) => (id === "unknown" ? "حساب ثبت نشده" : accountName(id)),
              )
            : analyticsGroupsFor(items, key);
        return [
          key,
          {
            key,
            label,
            overlapping,
            groups,
          },
        ];
      }),
    );
    return {
      summary: summarizePerformance(items),
      totalCount: trades.length,
      excludedCount: trades.length - items.length,
      invalidClosedCount:
        trades.filter((trade) => trade.status === "closed").length -
        items.length,
      calendar: calendar === "gregorian" ? "gregorian" : "jalali",
      hours,
      weekdays,
      monthDays,
      factors,
      outcomeFilter: ["win", "loss", "breakeven"].includes(
        refs.filterStatus.value,
      )
        ? refs.filterStatus.value
        : null,
      format: {
        number: displayNumber,
        money: displayMoney,
        r: displayR,
        rr: displayRR,
      },
    };
  }
  function renderWinRateCharts(trades) {
    const root = document.getElementById("charts-root");
    if (root && globalThis.EdgeUI?.renderCharts)
      globalThis.EdgeUI.renderCharts(root, buildWinRateChartData(trades));
  }
  const normalizedSearchText = (value) =>
    toEnglishDigits(value)
      .toLocaleLowerCase("fa-IR")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .trim();
  const closeListbox = (controller, restoreFocus = false) => {
    if (!controller) return;
    controller.close(restoreFocus);
    if (openListboxController === controller) openListboxController = null;
  };
  const createListboxController = (select) =>
    globalThis.EdgeUI.mountSelect(select, {
      beforeOpen: (controller) => {
        if (select.name === "confirmationDirection" && controller.panel) {
          controller.positionConfirmationOptions = () => {
            const rect = controller.button.getBoundingClientRect();
            const below = innerHeight - rect.bottom - 16,
              above = rect.top - 16;
            const height = Math.min(200, Math.max(44, below, above));
            const up = below < 200 && above > below;
            const width = Math.min(rect.width, innerWidth - 32);
            Object.assign(controller.panel.style, {
              position: "fixed",
              left:
                Math.max(16, Math.min(rect.left, innerWidth - width - 16)) +
                "px",
              right: "auto",
              width: width + "px",
              top:
                (up ? Math.max(16, rect.top - height - 6) : rect.bottom + 6) +
                "px",
              bottom: "auto",
              maxHeight: height + "px",
            });
          };
          controller.positionConfirmationOptions();
        }
        if (openDateController) closePersianCalendar(openDateController, false);
        if (openListboxController && openListboxController !== controller)
          closeListbox(openListboxController, false);
      },
      onOpen: (controller) => {
        openListboxController = controller;
      },
      onClose: (controller) => {
        if (openListboxController === controller) openListboxController = null;
      },
    });
  const initializeListboxes = () =>
    $$("select:not([multiple]):not([data-multi-backing])").forEach((select) => {
      if (!listboxControllers.has(select))
        listboxControllers.set(select, createListboxController(select));
    });
  const syncAllListboxes = (rebuild = false) =>
    listboxControllers.forEach((controller) =>
      rebuild ? controller.refresh() : controller.sync(),
    );
  const visibleControlFor = (control) =>
    listboxControllers.get(control)?.button || control;
  const setAccordion = (item, open) => {
    if (!item) return;
    globalThis.EdgeUI.setDisclosure(item, open);
    if (
      !open &&
      openListboxController &&
      item.contains(openListboxController.root)
    )
      closeListbox(openListboxController, false);
    if (
      !open &&
      openDateController &&
      item.contains(openDateController.wrapper)
    )
      closePersianCalendar(openDateController, false);
  };
  const openAccordionFor = (control) => {
    const item = control?.closest?.("[data-accordion]");
    if (item) setAccordion(item, true);
  };
  const initializeAccordions = () => {
    $$("[data-accordion]").forEach((item) => {
      const controller = globalThis.EdgeUI.mountDisclosure(item);
      if (!controller) return;
      const trigger = controller.button;
      trigger.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        const groupRoot =
          trigger.closest("form") ||
          trigger.closest(".backup-card") ||
          item.parentElement;
        const available = $$(
          "[data-accordion] .edge-disclosure-trigger",
          groupRoot,
        ).filter(
          (candidate) =>
            !candidate.closest(".close-fields") ||
            candidate.closest(".close-fields").classList.contains("visible"),
        );
        const index = available.indexOf(trigger);
        if (index < 0) return;
        event.preventDefault();
        const targetIndex =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? available.length - 1
              : event.key === "ArrowDown"
                ? (index + 1) % available.length
                : (index - 1 + available.length) % available.length;
        available[targetIndex].focus();
      });
    });
    $$(
      "details.factor-details, details.dashboard-secondary, details.account-overview",
    ).forEach((item) => globalThis.EdgeUI.mountDisclosure(item));
    globalThis.EdgeUI.mountDisclosure($("#report-filter-shell"), {
      trigger: $("#toggle-report-filters"),
      panel: $("#report-filter-content"),
      inline: true,
      openLabel: "بستن فیلترها",
      closedLabel: "نمایش فیلترها",
      onChange: (open) => {
        filterPanelState.set(currentView, open);
      },
    });
  };
  const setPersianDateInput = (input, iso) => {
    if (!input) return;
    const canonical = iso && validDate(iso) ? iso : "";
    input.dataset.iso = canonical;
    input.value = canonical ? formatPersianDateInput(canonical) : "";
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  };
  const readPersianDateInput = (input) => {
    if (!input || !input.value.trim()) return "";
    const parsed = parsePersianDate(input.value);
    if (parsed) input.dataset.iso = parsed;
    return parsed || input.value.trim();
  };
  const closePersianCalendar = (controller, restoreFocus = false) => {
    if (!controller || controller.panel.hidden) return;
    controller.panel.hidden = true;
    controller.toggle.setAttribute("aria-expanded", "false");
    if (openDateController === controller) openDateController = null;
    if (restoreFocus) controller.input.focus();
  };
  const jalaliMonthLength = (year, month) =>
    month <= 6
      ? 31
      : month <= 11
        ? 30
        : jalaliToGregorian(year, 12, 30)
          ? 30
          : 29;
  const shiftedPersianMonth = (year, month, delta) => {
    const index = year * 12 + month - 1 + delta;
    return {
      year: Math.floor(index / 12),
      month: (((index % 12) + 12) % 12) + 1,
    };
  };
  const renderPersianCalendar = (controller, focusIso = null) => {
    const { panel } = controller;
    panel.textContent = "";
    const head = makeElement("div", "calendar-head");
    const previous = makeElement("button", "calendar-nav");
    previous.dataset.heroicon = "chevron-right";
    window.EdgeIcons?.apply(previous);
    const title = makeElement(
      "strong",
      "",
      PERSIAN_MONTHS[controller.viewMonth - 1] +
        " " +
        toPersianDigits(controller.viewYear),
    );
    const next = makeElement("button", "calendar-nav");
    next.dataset.heroicon = "chevron-left";
    window.EdgeIcons?.apply(next);
    previous.type = next.type = "button";
    previous.setAttribute("aria-label", "ماه قبل");
    next.setAttribute("aria-label", "ماه بعد");
    head.append(previous, title, next);
    const week = makeElement("div", "calendar-week");
    PERSIAN_WEEK_SHORT.forEach((day) =>
      week.appendChild(makeElement("span", "", day)),
    );
    const days = makeElement("div", "calendar-days");
    days.setAttribute("role", "grid");
    days.setAttribute("aria-label", "روزهای " + title.textContent);
    const firstIso = jalaliToGregorian(
      controller.viewYear,
      controller.viewMonth,
      1,
    );
    const [firstYear, firstMonth, firstDay] = firstIso.split("-").map(Number);
    const offset =
      (new Date(Date.UTC(firstYear, firstMonth - 1, firstDay)).getUTCDay() +
        1) %
      7;
    const gridStart = shiftIsoDate(firstIso, -offset);
    const selectedIso = parsePersianDate(controller.input.value) || "";
    const todayIso = today();
    for (let index = 0; index < 42; index++) {
      const iso = shiftIsoDate(gridStart, index);
      const parts = gregorianToJalali(iso);
      const day = makeElement(
        "button",
        "calendar-day" +
          (parts.month === controller.viewMonth ? "" : " outside"),
        toPersianDigits(parts.day),
      );
      day.type = "button";
      day.dataset.iso = iso;
      day.setAttribute("role", "gridcell");
      day.setAttribute("aria-selected", String(iso === selectedIso));
      day.setAttribute(
        "aria-label",
        WEEKDAY_LABELS[new Date(iso + "T00:00:00Z").getUTCDay()] +
          " " +
          toPersianDigits(parts.day) +
          " " +
          PERSIAN_MONTHS[parts.month - 1] +
          " " +
          toPersianDigits(parts.year),
      );
      if (iso === todayIso) {
        day.classList.add("today");
        day.setAttribute("aria-current", "date");
      }
      day.tabIndex = iso === (focusIso || selectedIso || todayIso) ? 0 : -1;
      day.addEventListener("click", () => {
        setPersianDateInput(controller.input, iso);
        controller.input.dispatchEvent(
          new Event("input", {
            bubbles: true,
          }),
        );
        controller.input.dispatchEvent(
          new Event("change", {
            bubbles: true,
          }),
        );
        closePersianCalendar(controller, true);
      });
      day.addEventListener("keydown", (event) => {
        let nextIso = null;
        if (event.key === "ArrowLeft") nextIso = shiftIsoDate(iso, 1);
        else if (event.key === "ArrowRight") nextIso = shiftIsoDate(iso, -1);
        else if (event.key === "ArrowDown") nextIso = shiftIsoDate(iso, 7);
        else if (event.key === "ArrowUp") nextIso = shiftIsoDate(iso, -7);
        else if (event.key === "Home")
          nextIso = shiftIsoDate(
            iso,
            -((new Date(iso + "T00:00:00Z").getUTCDay() + 1) % 7),
          );
        else if (event.key === "End")
          nextIso = shiftIsoDate(
            iso,
            6 - ((new Date(iso + "T00:00:00Z").getUTCDay() + 1) % 7),
          );
        else if (event.key === "PageUp" || event.key === "PageDown") {
          const current = gregorianToJalali(iso);
          const shifted = shiftedPersianMonth(
            current.year,
            current.month,
            event.key === "PageUp" ? -1 : 1,
          );
          nextIso = jalaliToGregorian(
            shifted.year,
            shifted.month,
            Math.min(
              current.day,
              jalaliMonthLength(shifted.year, shifted.month),
            ),
          );
        } else if (event.key === "Escape") {
          event.preventDefault();
          closePersianCalendar(controller, true);
          return;
        } else return;
        event.preventDefault();
        if (!nextIso) return;
        const nextParts = gregorianToJalali(nextIso);
        controller.viewYear = nextParts.year;
        controller.viewMonth = nextParts.month;
        renderPersianCalendar(controller, nextIso);
        requestAnimationFrame(() =>
          $(
            '.calendar-day[data-iso="' + nextIso + '"]',
            controller.panel,
          )?.focus(),
        );
      });
      days.appendChild(day);
    }
    const foot = makeElement("div", "calendar-foot");
    const todayButton = makeElement("button", "calendar-action", "امروز");
    const clearButton = makeElement("button", "calendar-action", "پاک‌کردن");
    todayButton.type = clearButton.type = "button";
    todayButton.addEventListener("click", () => {
      setPersianDateInput(controller.input, todayIso);
      controller.input.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
      controller.input.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );
      closePersianCalendar(controller, true);
    });
    clearButton.addEventListener("click", () => {
      setPersianDateInput(controller.input, "");
      controller.input.dispatchEvent(
        new Event("input", {
          bubbles: true,
        }),
      );
      controller.input.dispatchEvent(
        new Event("change", {
          bubbles: true,
        }),
      );
      closePersianCalendar(controller, true);
    });
    foot.append(todayButton, clearButton);
    panel.append(head, week, days, foot);
    const changeMonth = (delta) => {
      const shifted = shiftedPersianMonth(
        controller.viewYear,
        controller.viewMonth,
        delta,
      );
      if (shifted.year < 1200 || shifted.year > 1600) return;
      controller.viewYear = shifted.year;
      controller.viewMonth = shifted.month;
      const iso = jalaliToGregorian(shifted.year, shifted.month, 1);
      renderPersianCalendar(controller, iso);
      requestAnimationFrame(() =>
        $('.calendar-day[data-iso="' + iso + '"]', controller.panel)?.focus(),
      );
    };
    previous.addEventListener("click", () => changeMonth(-1));
    next.addEventListener("click", () => changeMonth(1));
  };
  const openPersianCalendar = (controller) => {
    globalThis.EdgeUI?.closeAll?.();
    if (openListboxController) closeListbox(openListboxController, false);
    if (openDateController && openDateController !== controller)
      closePersianCalendar(openDateController, false);
    const selectedIso = parsePersianDate(controller.input.value) || today();
    const parts = gregorianToJalali(selectedIso);
    controller.viewYear = parts.year;
    controller.viewMonth = parts.month;
    controller.panel.hidden = false;
    controller.toggle.setAttribute("aria-expanded", "true");
    openDateController = controller;
    renderPersianCalendar(controller, selectedIso);
    requestAnimationFrame(() =>
      $(
        '.calendar-day[data-iso="' + selectedIso + '"]',
        controller.panel,
      )?.focus(),
    );
  };
  const createPersianDateController = (input) => {
    const label = $('label[for="' + input.id + '"]');
    const wrapper = makeElement("div", "date-control");
    const toggle = makeElement("button", "calendar-toggle");
    toggle.dataset.heroicon = "calendar";
    window.EdgeIcons?.apply(toggle);
    const panel = makeElement("div", "persian-calendar");
    toggle.type = "button";
    toggle.id = input.id + "-calendar-button";
    toggle.setAttribute(
      "aria-label",
      "باز کردن تقویم " + (label?.textContent.trim() || "تاریخ"),
    );
    toggle.setAttribute("aria-haspopup", "dialog");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", input.id + "-calendar");
    panel.id = input.id + "-calendar";
    panel.setAttribute("role", "dialog");
    panel.setAttribute(
      "aria-label",
      "تقویم جلالی " + (label?.textContent.trim() || "تاریخ"),
    );
    panel.hidden = true;
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(input, toggle, panel);
    const controller = {
      input,
      wrapper,
      toggle,
      panel,
      viewYear: 1405,
      viewMonth: 1,
    };
    toggle.addEventListener("click", () =>
      panel.hidden
        ? openPersianCalendar(controller)
        : closePersianCalendar(controller, true),
    );
    input.addEventListener("keydown", (event) => {
      if ((event.key === "ArrowDown" && event.altKey) || event.key === "F4") {
        event.preventDefault();
        openPersianCalendar(controller);
      } else if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        closePersianCalendar(controller, true);
      }
    });
    input.addEventListener("input", () => {
      const start = input.selectionStart;
      const transform = (value) =>
        toPersianDigits(
          toEnglishDigits(value).replace(/[.٫-]/g, "/").replace(/\s/g, ""),
        );
      const prefix =
        start === null ? null : transform(input.value.slice(0, start));
      input.value = transform(input.value).slice(0, 10);
      if (prefix !== null && document.activeElement === input)
        input.setSelectionRange(
          Math.min(prefix.length, input.value.length),
          Math.min(prefix.length, input.value.length),
        );
      const parsed = parsePersianDate(input.value);
      input.dataset.iso = parsed || "";
      if (parsed || !input.value) {
        input.setCustomValidity("");
        input.removeAttribute("aria-invalid");
      }
    });
    input.addEventListener("blur", () => {
      const parsed = parsePersianDate(input.value);
      const valid = !input.value || Boolean(parsed);
      input.setCustomValidity(
        valid ? "" : "تاریخ شمسی را مانند ۱۴۰۵/۰۵/۱۲ وارد کن.",
      );
      setAriaInvalid(input, !valid);
      if (parsed) setPersianDateInput(input, parsed);
    });
    panel.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closePersianCalendar(controller, true);
    });
    return controller;
  };
  const initializePersianDatePickers = () =>
    $$("[data-persian-date]").forEach((input) => {
      if (!dateControllers.has(input))
        dateControllers.set(input, createPersianDateController(input));
    });
  document.addEventListener("pointerdown", (event) => {
    if (
      openListboxController &&
      !openListboxController.root.contains(event.target)
    )
      closeListbox(openListboxController, false);
    if (
      openDateController &&
      !openDateController.wrapper.contains(event.target)
    )
      closePersianCalendar(openDateController, false);
  });
  document.addEventListener("focusin", (event) => {
    if (
      openDateController &&
      !openDateController.wrapper.contains(event.target)
    )
      closePersianCalendar(openDateController, false);
  });
  const readProjectionParameters = () => {
    const trades = finiteNumber(refs.projectionTrades.value);
    const riskPercent = finiteNumber(refs.projectionRisk.value);
    const balance = finiteNumber(refs.projectionBalance.value);
    const validity = {
      trades: Number.isInteger(trades) && trades >= 1 && trades <= 1000,
      risk: riskPercent !== null && riskPercent >= 0.01 && riskPercent <= 20,
      balance: balance !== null && balance > 0,
    };
    [
      [refs.projectionTrades, validity.trades],
      [refs.projectionRisk, validity.risk],
      [refs.projectionBalance, validity.balance],
    ].forEach(([control, valid]) => {
      setAriaInvalid(control, !valid);
    });
    return {
      valid: Object.values(validity).every(Boolean),
      trades,
      riskPercent,
      balance,
    };
  };
  const projectionCompactNumber = (value, digits = 1) => {
    if (value === Infinity) return "∞";
    if (value === -Infinity) return "−∞";
    if (!Number.isFinite(value)) return "—";
    const normalized = Math.abs(value) < 1e-10 ? 0 : value;
    if (Math.abs(normalized) >= 1e7)
      return formatEditableNumber(
        normalized.toExponential(2).replace("e+", "e"),
      );
    return displayNumber(normalized, digits);
  };
  const projectionPercent = (value) => {
    if (value === Infinity) return "+∞٪";
    if (value === -Infinity) return "−∞٪";
    if (!Number.isFinite(value)) return "—";
    const normalized = Math.abs(value) < 1e-10 ? 0 : value;
    return (
      (normalized > 0 ? "+" : "") +
      projectionCompactNumber(normalized, Math.abs(normalized) < 1000 ? 1 : 0) +
      "٪"
    );
  };
  const projectionMoney = (value) => {
    if (value === Infinity) return "∞ " + state.settings.currency;
    return displayMoney(value);
  };
  const renderProjectionHeader = () => {
    refs.projectionHead.textContent = "";
    const row = document.createElement("tr");
    const corner = makeElement("th", "", "WR ↓ / R/R →");
    corner.scope = "col";
    corner.dir = "ltr";
    row.appendChild(corner);
    for (let rr = 1; rr <= 15; rr++) {
      const cell = makeElement(
        "th",
        "",
        displayNumber(1, 0) + ":" + displayNumber(rr, 0),
      );
      cell.scope = "col";
      cell.dir = "ltr";
      row.appendChild(cell);
    }
    refs.projectionHead.appendChild(row);
  };
  const scheduleProjectionAnnouncement = (message) => {
    clearTimeout(projectionAnnounceTimer);
    projectionAnnounceTimer = setTimeout(() => {
      refs.projectionLive.textContent = message;
    }, 250);
  };
  const clearProjectionSummary = (message) => {
    refs.projectionSelected.textContent = "ورودی سناریو نامعتبر است";
    refs.projectionEquation.textContent = message;
    refs.projectionBreakeven.textContent = "نرخ برد سربه‌سر: —";
    [
      refs.projectionTp,
      refs.projectionSl,
      refs.projectionNetR,
      refs.projectionRiskAmount,
      refs.projectionSimpleGrowth,
      refs.projectionCompoundGrowth,
    ].forEach((element) => {
      element.textContent = "—";
    });
    refs.projectionSimpleGrowth.className = "";
    refs.projectionCompoundGrowth.className = "";
    refs.projectionRiskContext.textContent = "از موجودی مبنا";
    refs.projectionSimpleFinal.textContent = "ماندهٔ نهایی: —";
    refs.projectionCompoundFinal.textContent = "ماندهٔ نهایی: —";
    scheduleProjectionAnnouncement("ورودی سناریو نامعتبر است. " + message);
  };
  const renderProjectionSummary = (scenario) => {
    const compoundMode = refs.projectionMode.value !== "simple";
    const modelLabel = compoundMode ? "مرکب" : "ساده";
    const ratioText = displayNumber(1, 0) + ":" + displayNumber(scenario.rr, 0);
    const isolatedRatio = "\u2066R/R " + ratioText + "\u2069";
    const selectedBreakEven = compoundMode
      ? scenario.compoundBreakEvenWinRate
      : scenario.breakEvenWinRate;
    const stopsCovered = compoundMode
      ? scenario.compoundStopsCoveredPerTarget
      : scenario.stopsCoveredPerTarget;
    const targetsNeeded = compoundMode
      ? scenario.compoundTargetsNeededToCoverStops
      : scenario.targetsNeededToCoverStops;
    const selectedGrowth = compoundMode
      ? scenario.compoundGrowth
      : scenario.simpleGrowth;
    const coverageExplanation = compoundMode
      ? "از نظر R ثابت، یک TP با " +
        isolatedRatio +
        " معادل " +
        displayNumber(scenario.stopsCoveredPerTarget, 0) +
        " SL است؛ با ریسک مرکب از ماندهٔ جاری، حدود " +
        projectionCompactNumber(stopsCovered, 2) +
        " SL را جبران می‌کند."
      : "در مدل ساده، یک TP با " +
        isolatedRatio +
        " معادل " +
        displayNumber(stopsCovered, 0) +
        " SL است.";
    refs.projectionSelected.textContent =
      "سناریوی انتخابی: " +
      isolatedRatio +
      " · نرخ برد " +
      displayNumber(scenario.winRate, 0) +
      "٪";
    refs.projectionBreakeven.textContent =
      "نرخ برد سربه‌سر " +
      modelLabel +
      ": " +
      displayNumber(selectedBreakEven, 1) +
      "٪";
    refs.projectionTp.textContent = projectionCompactNumber(
      scenario.expectedWins,
      1,
    );
    refs.projectionSl.textContent = projectionCompactNumber(
      scenario.expectedLosses,
      1,
    );
    refs.projectionNetR.textContent =
      (scenario.netR > 0 ? "+" : "") +
      projectionCompactNumber(scenario.netR, 1) +
      "R";
    refs.projectionRiskAmount.textContent = projectionMoney(
      scenario.riskAmount,
    );
    refs.projectionRiskContext.textContent =
      displayNumber(scenario.riskPercent, 2) +
      "٪ از " +
      projectionMoney(scenario.balance);
    refs.projectionSimpleGrowth.textContent = projectionPercent(
      scenario.simpleGrowth,
    );
    refs.projectionSimpleGrowth.className =
      scenario.simpleGrowth > 0
        ? "positive"
        : scenario.simpleGrowth < 0
          ? "negative"
          : "";
    refs.projectionSimpleFinal.textContent =
      scenario.simpleGrowth <= -100
        ? "ماندهٔ نظری: صفر / ورشکستگی"
        : "ماندهٔ نهایی: " + projectionMoney(scenario.simpleFinalBalance);
    refs.projectionCompoundGrowth.textContent = projectionPercent(
      scenario.compoundGrowth,
    );
    refs.projectionCompoundGrowth.className =
      scenario.compoundGrowth > 0
        ? "positive"
        : scenario.compoundGrowth < 0
          ? "negative"
          : "";
    refs.projectionCompoundFinal.textContent =
      "ماندهٔ نهایی: " + projectionMoney(scenario.compoundFinalBalance);
    refs.projectionEquation.textContent =
      coverageExplanation +
      " برای جبران " +
      projectionCompactNumber(scenario.expectedLosses, 1) +
      " SL در مدل " +
      modelLabel +
      "، حدود " +
      projectionCompactNumber(targetsNeeded, 1) +
      " TP لازم است؛ این سناریو " +
      projectionCompactNumber(scenario.expectedWins, 1) +
      " TP دارد. محاسبات پیش از کارمزد است.";
    scheduleProjectionAnnouncement(
      isolatedRatio +
        "، نرخ برد " +
        displayNumber(scenario.winRate, 0) +
        " درصد؛ " +
        projectionCompactNumber(scenario.expectedWins, 1) +
        " تارگت، " +
        projectionCompactNumber(scenario.expectedLosses, 1) +
        " استاپ و رشد " +
        modelLabel +
        " " +
        projectionPercent(selectedGrowth),
    );
  };
  const renderProjectionMatrix = (parameters) => {
    renderProjectionHeader();
    refs.projectionBody.textContent = "";
    if (!parameters.valid) {
      const row = document.createElement("tr");
      const cell = makeElement(
        "td",
        "empty-state",
        "تعداد پوزیشن باید عدد صحیح ۱ تا ۱۰۰۰، ریسک بین ۰٫۰۱ تا ۲۰٪ و موجودی مثبت باشد.",
      );
      cell.colSpan = 16;
      row.appendChild(cell);
      refs.projectionBody.appendChild(row);
      return;
    }
    const mode = refs.projectionMode.value === "simple" ? "simple" : "compound";
    for (let winRate = 0; winRate <= 80; winRate += 5) {
      const row = document.createElement("tr");
      const rateHeader = makeElement("th", "", displayNumber(winRate, 0) + "٪");
      rateHeader.scope = "row";
      row.appendChild(rateHeader);
      for (let rr = 1; rr <= 15; rr++) {
        const scenario = calculateProjectionScenario({
          rr,
          winRate,
          ...parameters,
        });
        const growth = scenario.valid
          ? mode === "simple"
            ? scenario.simpleGrowth
            : scenario.compoundGrowth
          : NaN;
        const tone =
          !Number.isFinite(growth) &&
          growth !== Infinity &&
          growth !== -Infinity
            ? "neutral"
            : Math.abs(growth) < 0.005
              ? "neutral"
              : growth > 0
                ? "positive"
                : "negative";
        const cell = document.createElement("td");
        const button = makeElement(
          "button",
          "projection-cell " + tone,
          projectionPercent(growth),
        );
        const selectedCell =
          projectionSelection.rr === rr &&
          projectionSelection.winRate === winRate;
        button.type = "button";
        button.dataset.rr = String(rr);
        button.dataset.winRate = String(winRate);
        button.tabIndex = selectedCell ? 0 : -1;
        button.disabled = !scenario.valid;
        button.setAttribute("aria-pressed", String(selectedCell));
        button.setAttribute(
          "aria-keyshortcuts",
          "ArrowLeft ArrowRight ArrowUp ArrowDown Home End",
        );
        button.setAttribute(
          "aria-label",
          scenario.valid
            ? "R/R یک به " +
                displayNumber(rr, 0) +
                "، نرخ برد " +
                displayNumber(winRate, 0) +
                " درصد، " +
                projectionCompactNumber(scenario.expectedWins, 1) +
                " تارگت، " +
                projectionCompactNumber(scenario.expectedLosses, 1) +
                " استاپ، رشد " +
                (mode === "simple" ? "ساده " : "مرکب ") +
                projectionPercent(growth)
            : "سناریوی غیرقابل محاسبه برای R/R یک به " +
                displayNumber(rr, 0) +
                " و نرخ برد " +
                displayNumber(winRate, 0) +
                " درصد",
        );
        cell.appendChild(button);
        row.appendChild(cell);
      }
      refs.projectionBody.appendChild(row);
    }
  };
  const renderProjection = () => {
    const parameters = readProjectionParameters();
    refs.projectionModeNote.textContent =
      refs.projectionMode.value === "simple"
        ? "با کلیدهای جهت‌دار بین خانه‌ها حرکت کن. مدل ساده، مبلغ ریسک را بر اساس موجودی اولیه ثابت می‌گیرد؛ رشد کمتر از منفی ۱۰۰٪ به معنی ورشکستگی نظری است. اعداد کارمزد، لغزش و ترتیب نتایج را مدل نمی‌کنند."
        : "با کلیدهای جهت‌دار بین خانه‌ها حرکت کن. مدل مرکب، درصد ریسک را از ماندهٔ جاری هر معامله می‌گیرد و رشد هندسی ترکیب TP و SL را نشان می‌دهد. اعداد نظری‌اند و کارمزد، لغزش، ترتیب نتایج و افت سرمایه را مدل نمی‌کنند.";
    if (!parameters.valid) {
      clearProjectionSummary(
        "مقادیر تعداد پوزیشن، درصد ریسک و موجودی مبنا را اصلاح کن.",
      );
      renderProjectionMatrix(parameters);
      return;
    }
    const selected = calculateProjectionScenario({
      ...projectionSelection,
      ...parameters,
    });
    renderProjectionSummary(selected);
    renderProjectionMatrix(parameters);
  };
  const focusProjectionSelection = () => {
    const selected = refs.projectionBody.querySelector(
      'button[data-rr="' +
        projectionSelection.rr +
        '"][data-win-rate="' +
        projectionSelection.winRate +
        '"]',
    );
    if (selected && !selected.disabled) selected.focus();
  };
  const badge = (text, tone) =>
    makeElement("span", "badge " + (tone || ""), text);
  const formatDate = (value) => {
    if (!validDate(value)) return value;
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
      calendar: "persian",
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  };
  const appendPrimarySecondary = (
    cell,
    primary,
    secondary,
    primaryClass = "",
  ) => {
    cell.appendChild(
      makeElement("span", "cell-primary " + primaryClass, primary),
    );
    if (secondary)
      cell.appendChild(makeElement("span", "cell-secondary", secondary));
  };
  const actionButton = (label, ariaLabel, callback, className = "") => {
    const button = makeElement("button", "table-action " + className, label);
    button.type = "button";
    button.setAttribute("aria-label", ariaLabel);
    button.addEventListener("click", callback);
    return button;
  };

  // Thumbnails are decoded lazily; full image data stays in IndexedDB until needed.
  const tradeThumbnailCache = new Map();
  let tradeThumbnailObserver = null;
  const loadTradeThumbnail = (id) => {
    if (tradeThumbnailCache.has(id)) return tradeThumbnailCache.get(id);
    const promise = (async () => {
      const asset = await getTradeImage(id);
      if (!asset)
        throw new Error(
          "تصویر محلی پیدا نشد؛ آن را دوباره پیوست کن یا پشتیبان JSON کامل را وارد کن.",
        );
      const source = new Image();
      await new Promise((resolve, reject) => {
        source.onload = resolve;
        source.onerror = () => reject(new Error("تصویر خوانده نشد."));
        source.src = asset.dataUrl;
      });
      const scale = Math.min(
        1,
        160 / source.naturalWidth,
        120 / source.naturalHeight,
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
      canvas
        .getContext("2d")
        .drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/webp", 0.78);
    })();
    tradeThumbnailCache.set(id, promise);
    if (tradeThumbnailCache.size > 200)
      tradeThumbnailCache.delete(tradeThumbnailCache.keys().next().value);
    promise.catch(() => tradeThumbnailCache.delete(id));
    return promise;
  };
  const createTradeThumbnail = (trade) => {
    const images = trade.images || [];
    if (!images.length) return null;
    const button = makeElement("button", "trade-thumbnail");
    button.type = "button";
    button.setAttribute("aria-label", "نمایش تصویر معاملهٔ " + trade.symbol);
    button.title =
      "نمایش تصویر معامله · " + displayNumber(images.length) + " تصویر";
    const image = document.createElement("img");
    image.alt = "پیش‌نمایش معاملهٔ " + trade.symbol;
    image.hidden = true;
    image.decoding = "async";
    const status = makeElement("span", "trade-thumbnail-status");
    status.dataset.heroicon = "photo";
    window.EdgeIcons?.apply(status);
    status.setAttribute("aria-hidden", "true");
    button.append(image, status);
    if (images.length > 1)
      button.appendChild(
        makeElement(
          "span",
          "trade-thumbnail-count",
          "+" + displayNumber(images.length - 1),
        ),
      );
    button.addEventListener(
      "click",
      async () =>
        await openTradeImage(
          images[0].id,
          "تصویر معاملهٔ " + trade.symbol,
          images,
        ),
    );
    const load = () =>
      loadTradeThumbnail(images[0].id)
        .then((src) => {
          if (button.isConnected) {
            image.src = src;
            image.hidden = false;
            status.remove();
          }
        })
        .catch((error) => {
          if (button.isConnected) {
            status.textContent = "!";
            button.title = error.message;
          }
        });
    button._loadThumbnail = load;
    if (tradeThumbnailObserver) tradeThumbnailObserver.observe(button);
    else load();
    return button;
  };
  let imageViewerGeneration = 0;
  let imageViewerSelection = {
    images: [],
    index: 0,
    label: "تصویر معامله",
  };
  const renderTradeImageViewer = async () => {
    const generation = ++imageViewerGeneration;
    const selection = imageViewerSelection;
    const metadata = selection.images[selection.index];
    const picture = $("#trade-image-viewer-image"),
      status = $("#trade-image-viewer-status"),
      download = $("#trade-image-download");
    picture.hidden = true;
    picture.removeAttribute("src");
    status.hidden = false;
    status.textContent = "در حال خواندن تصویر…";
    $("#trade-image-viewer-title").textContent = selection.label;
    $("#trade-image-viewer-count").textContent =
      displayNumber(selection.index + 1) +
      " / " +
      displayNumber(selection.images.length) +
      (metadata?.name ? " · " + metadata.name : "");
    $("#trade-image-previous").hidden = selection.images.length < 2;
    $("#trade-image-next").hidden = selection.images.length < 2;
    $("#trade-image-previous").disabled = selection.index === 0;
    $("#trade-image-next").disabled =
      selection.index === selection.images.length - 1;
    download.removeAttribute("href");
    download.setAttribute("aria-disabled", "true");
    try {
      const asset = await getTradeImage(metadata.id);
      if (generation !== imageViewerGeneration) return;
      if (!asset)
        throw new Error(
          "تصویر در این مرورگر پیدا نشد. دوباره پیوست کن یا پشتیبان JSON شامل تصویر را وارد کن.",
        );
      picture.alt = selection.label + (asset.name ? " · " + asset.name : "");
      picture.src = asset.dataUrl;
      picture.hidden = false;
      status.hidden = true;
      download.href = asset.dataUrl;
      download.download = asset.name || "trade-image.webp";
      download.setAttribute("aria-disabled", "false");
    } catch (error) {
      if (generation === imageViewerGeneration)
        status.textContent = error.message;
    }
  };
  const openTradeImage = async (id, label = "تصویر معامله", images = []) => {
    const list = images.length
      ? images
      : [
          {
            id,
          },
        ];
    imageViewerSelection = {
      images: list,
      index: Math.max(
        0,
        list.findIndex((item) => item.id === id),
      ),
      label,
    };
    const dialog = $("#trade-image-viewer");
    if (!dialog.open) dialog.showModal();
    await renderTradeImageViewer();
  };
  const initializeImageViewer = () => {
    const dialog = $("#trade-image-viewer");
    $("#close-trade-image-viewer").addEventListener("click", () =>
      dialog.close(),
    );
    dialog.addEventListener("close", () => {
      imageViewerGeneration++;
      $("#trade-image-viewer-image").removeAttribute("src");
    });
    const move = async (direction) => {
      const next = imageViewerSelection.index + direction;
      if (next >= 0 && next < imageViewerSelection.images.length) {
        imageViewerSelection.index = next;
        await renderTradeImageViewer();
      }
    };
    $("#trade-image-previous").addEventListener(
      "click",
      async () => await move(-1),
    );
    $("#trade-image-next").addEventListener("click", async () => await move(1));
    dialog.addEventListener("keydown", async (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        await move(-1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        await move(1);
      }
    });
    $("#trade-image-viewer-image").addEventListener("error", () => {
      $("#trade-image-viewer-status").hidden = false;
      $("#trade-image-viewer-status").textContent = "نمایش تصویر ممکن نشد.";
    });
  };

  // Read-only position page. Always derive values from this position's own saved baseline.
  let tradeDetailRenderGeneration = 0;
  const positionDetailText = (value) =>
    value === null || value === undefined || String(value).trim() === ""
      ? "ثبت نشده"
      : String(value);
  const positionDetailNumber = (value, formatter = displayNumber) =>
    value === null || value === undefined || !Number.isFinite(value)
      ? "ثبت نشده"
      : formatter(value);
  const positionDetailCard = (title, copy = "") => {
    const card = makeElement("article", "position-detail-card");
    card.appendChild(makeElement("h2", "", title));
    if (copy)
      card.appendChild(makeElement("p", "position-detail-card-copy", copy));
    return card;
  };
  const positionDetailData = (card, rows) => {
    const list = makeElement("dl", "position-detail-data");
    rows.forEach(([label, value, numeric = false, tone = ""]) => {
      const row = makeElement("div", "position-detail-data-row");
      const term = makeElement("dt", "", label);
      const definition = makeElement("dd", tone);
      definition.appendChild(
        makeElement(
          numeric ? "bdi" : "span",
          numeric ? "position-detail-number" : "",
          positionDetailText(value),
        ),
      );
      row.append(term, definition);
      list.appendChild(row);
    });
    card.appendChild(list);
    return card;
  };
  const positionDetailMetric = (
    label,
    value,
    note,
    className = "",
    numeric = true,
    unknown = false,
  ) => {
    const card = makeElement("article", "position-detail-metric " + className);
    card.appendChild(
      makeElement("span", "position-detail-metric-label", label),
    );
    const strong = makeElement(
      "strong",
      "position-detail-metric-value" + (unknown ? " is-unknown" : ""),
    );
    strong.appendChild(
      makeElement(
        numeric && !unknown ? "bdi" : "span",
        numeric && !unknown ? "position-detail-number" : "",
        value,
      ),
    );
    card.append(
      strong,
      makeElement("span", "position-detail-metric-note", note),
    );
    return card;
  };
  const positionDetailDateTime = (date, time) =>
    validDate(date)
      ? formatDate(date) +
        " · " +
        (validTime(time) ? formatPersianTime(time) : "ساعت ثبت نشده")
      : "ثبت نشده";
  const positionDetailRecordedAt = (value) => {
    if (!value || !Number.isFinite(new Date(value).getTime()))
      return positionDetailText(value);
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  };
  const positionContextDirection = (value) =>
    CONTEXT_DIRECTION_LABELS[value] || CONTEXT_DIRECTION_LABELS.unknown;
  const positionTimeframeDirectionCard = (trade) => {
    const card = positionDetailCard(
      "جهت تایم‌فریم‌ها",
      "جهت بازار ثبت‌شده برای همین پوزیشن؛ مستقل از جهت لانگ یا شورت معامله.",
    );
    card.classList.add("position-timeframe-directions");
    positionDetailData(
      card,
      Object.entries(TIMEFRAME_DIRECTION_FIELDS).map(([key, label]) => [
        "جهت " + label,
        positionContextDirection(trade.timeframeDirections?.[key]),
      ]),
    );
    return card;
  };
  const appendConfirmationPositionContext = (
    element,
    trade,
    id,
    catalogItem,
  ) => {
    const saved = (trade.confirmationValues || []).find(
      (value) => value.id === id,
    );
    if (!saved) return;
    if (confirmationHasDirection(saved.type) || saved.direction !== "unknown") {
      const direction = makeElement(
        "p",
        "position-confirmation-direction is-" + (saved.direction || "unknown"),
        "جهت این پوزیشن: " + positionContextDirection(saved.direction),
      );
      element.appendChild(direction);
    }
    if (confirmationHasDetails(saved.type) || saved.details) {
      const label = makeElement(
        "span",
        "position-confirmation-note-label",
        "جزئیات این پوزیشن",
      );
      const note = makeElement(
        "p",
        saved.details ? "position-confirmation-note" : "position-detail-empty",
        saved.details || "جزئیاتی ثبت نشده است.",
      );
      note.dir = "auto";
      element.append(label, note);
    }
    if (catalogItem && (catalogItem.type || "simple") !== saved.type) {
      element.appendChild(
        makeElement(
          "small",
          "position-confirmation-history",
          "نوع ثبت‌شده: " +
            confirmationCatalogTypeLabel(saved.type) +
            " · نوع فعلی گزینه: " +
            confirmationCatalogTypeLabel(catalogItem.type),
        ),
      );
    }
  };
  const positionDetailOptions = (trade, group, title) => {
    const section = makeElement("section", "position-detail-factor");
    section.appendChild(makeElement("h3", "", title));
    const values = optionTradeValues(trade, group);
    if (!values.length) {
      section.appendChild(
        makeElement(
          "p",
          "position-detail-empty",
          group === "strategy" ? "ستاپ ثبت نشده" : "انتخابی ثبت نشده",
        ),
      );
      return section;
    }
    const list = document.createElement("ul");
    values.forEach((value) => {
      const catalogItem = state.options[group]?.find(
        (item) => item.id === value,
      );
      const item = makeElement("li", "position-detail-option");
      const name = makeElement(
        "div",
        "position-detail-option-name",
        catalogItem?.label ||
          recordedOptionLabel(trade, group, value) ||
          labelFor(group, value),
      );
      if (catalogItem?.active === false)
        name.appendChild(
          makeElement("span", "position-detail-retired", "بایگانی‌شده"),
        );
      item.appendChild(name);
      if (catalogItem?.description)
        item.appendChild(
          makeElement(
            "p",
            "position-detail-option-description",
            catalogItem.description,
          ),
        );
      if (group === "confirmations")
        appendConfirmationPositionContext(item, trade, value, catalogItem);
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  };
  const positionDetailImageGallery = (trade, generation) => {
    const card = positionDetailCard(
      "تصاویر پوزیشن",
      "روی هر تصویر بزن تا آن را در اندازهٔ بزرگ باز کنی.",
    );
    const images = trade.images || [];
    if (!images.length) {
      card.appendChild(
        makeElement(
          "p",
          "position-detail-empty",
          "تصویری به این پوزیشن پیوست نشده است. در ویرایش پوزیشن می‌توانی تصویر را بکشانی یا جای‌گذاری کنی.",
        ),
      );
      return card;
    }
    const gallery = makeElement("div", "position-detail-attachments");
    const current = (node) =>
      generation === tradeDetailRenderGeneration &&
      node.isConnected &&
      !$("#trade-detail-page").hidden &&
      $("#trade-detail-page").dataset.tradeId === trade.id;
    images.forEach(async (metadata, index) => {
      const figure = makeElement("figure", "position-detail-image");
      const button = makeElement("button", "position-detail-image-button");
      button.type = "button";
      button.disabled = true;
      button.setAttribute(
        "aria-label",
        "نمایش تصویر " + displayNumber(index + 1) + " پوزیشن " + trade.symbol,
      );
      const image = document.createElement("img");
      image.alt =
        "تصویر " +
        displayNumber(index + 1) +
        " پوزیشن " +
        trade.symbol +
        (metadata.name ? " · " + metadata.name : "");
      image.decoding = "async";
      image.hidden = true;
      const status = makeElement(
        "span",
        "position-detail-image-status",
        "در حال خواندن تصویر…",
      );
      button.append(image, status);
      button.onclick = async () =>
        await openTradeImage(
          metadata.id,
          "تصاویر پوزیشن " + trade.symbol,
          images,
        );
      figure.append(
        button,
        makeElement(
          "figcaption",
          "",
          metadata.name || "تصویر " + displayNumber(index + 1),
        ),
      );
      gallery.appendChild(figure);
      getTradeImage(metadata.id)
        .then((asset) => {
          if (!current(button)) return;
          if (!asset)
            throw new Error(
              "تصویر در این مرورگر پیدا نشد؛ پشتیبان JSON شامل تصاویر را وارد کن یا تصویر را دوباره پیوست کن.",
            );
          image.onload = () => {
            if (current(button)) {
              image.hidden = false;
              status.hidden = true;
              button.disabled = false;
            }
          };
          image.onerror = () => {
            if (current(button)) {
              status.textContent =
                "این تصویر قابل نمایش نیست؛ دوباره پیوست کن.";
              image.hidden = true;
              button.disabled = true;
            }
          };
          image.src = asset.dataUrl;
        })
        .catch((error) => {
          if (current(button))
            status.textContent = error.message || "خواندن تصویر ممکن نشد.";
        });
    });
    card.appendChild(gallery);
    return card;
  };
  const hasTradePartialExits = (trade) =>
    Boolean(
      trade.fills?.length ||
      (Array.isArray(trade.partialExits) && trade.partialExits.length),
    );
  const partialNetR = (partials) =>
    partials?.valid &&
    Number.isFinite(partials.netPnlToDate) &&
    Number.isFinite(partials.baselineRisk) &&
    partials.baselineRisk > 0
      ? partials.netPnlToDate / partials.baselineRisk
      : null;
  const partialCashTone = (value) =>
    value > 0 ? "positive" : value < 0 ? "negative" : "";
  const tradePartialMarker = (
    trade,
    partials = calculatePartialExits(trade),
  ) => {
    if (!hasTradePartialExits(trade)) return null;
    const marker = makeElement("span", "cell-secondary trade-partial-marker");
    if (!partials.valid || trade.status === "planned") {
      marker.textContent = "خروج جزئی نیازمند بررسی";
      return marker;
    }
    const count = displayNumber(partials.exits.length) + " خروج جزئی";
    marker.textContent =
      count +
      (trade.status === "open"
        ? " · " + displayNumber(partials.remainingPercent) + "٪ باز"
        : "");
    return marker;
  };
  const positionDetailPartials = (trade, partials) => {
    if (!hasTradePartialExits(trade)) return null;
    const card = positionDetailCard(
      "خروج‌های جزئی و سیو سود",
      "درصد هر خروج از حجم اولیهٔ همین پوزیشن است. قیمت هر ردیف از R، ورود و ریسک اولیه محاسبه شده است؛ مقادیر ردیف‌ها پیش از کارمزدند.",
    );
    card.classList.add("position-partial-card");
    if (!partials.valid || trade.status === "planned") {
      card.appendChild(
        makeElement(
          "p",
          "position-partial-warning",
          "خروج‌های جزئی این پوزیشن قابل محاسبه نیستند. مقدار R، درصد حجم، ریسک اولیه و وضعیت پوزیشن را در ویرایش بررسی کن.",
        ),
      );
      return card;
    }
    positionDetailData(card, [
      [
        "سهم بسته‌شده در خروج‌های جزئی",
        displayNumber(partials.closedPercent) + "٪ از حجم اولیه",
        true,
      ],
      [
        trade.status === "closed"
          ? "سهم خروج نهایی پس از خروج‌های جزئی"
          : "سهم باز باقی‌مانده",
        displayNumber(partials.remainingPercent) + "٪ از حجم اولیه",
        true,
      ],
      [
        trade.status === "closed" ? "حجم خروج نهایی" : "حجم باز باقی‌مانده",
        displayPrice(partials.remainingQuantity),
        true,
      ],
      ["R ناخالص مجموع خروج‌های جزئی", displayR(partials.weightedR), true],
      [
        "سود / زیان ناخالص خروج‌های جزئی",
        displayMoney(partials.grossPnl, trade.accountCurrency),
        true,
        partialCashTone(partials.grossPnl),
      ],
    ]);
    const scroll = makeElement("div", "table-scroll position-partial-table");
    scroll.tabIndex = 0;
    scroll.setAttribute("role", "region");
    scroll.setAttribute(
      "aria-label",
      "جدول قابل پیمایش خروج‌های جزئی پوزیشن " + trade.symbol,
    );
    const table = document.createElement("table");
    table.appendChild(
      makeElement(
        "caption",
        "sr-only",
        "جزئیات هر خروج جزئی از حجم اولیهٔ پوزیشن",
      ),
    );
    const head = document.createElement("thead");
    const heading = document.createElement("tr");
    [
      "خروج",
      "R خروج",
      "درصد حجم اولیه",
      "حجم خروج",
      "قیمت محاسبه‌شده از R",
      "سود / زیان ناخالص",
      "تاریخ و ساعت",
    ].forEach((label) => {
      const cell = makeElement("th", "", label);
      cell.scope = "col";
      heading.appendChild(cell);
    });
    head.appendChild(heading);
    table.appendChild(head);
    const body = document.createElement("tbody");
    partials.derivedExits.forEach((exit, index) => {
      const row = document.createElement("tr");
      const number = makeElement("th", "", displayNumber(index + 1));
      number.scope = "row";
      row.appendChild(number);
      [
        [displayR(exit.r), ""],
        [displayNumber(exit.percent) + "%", ""],
        [displayPrice(exit.quantity), ""],
        [displayPrice(exit.price), ""],
        [
          displayMoney(exit.grossPnl, trade.accountCurrency),
          partialCashTone(exit.grossPnl),
        ],
      ].forEach(([value, tone]) => {
        const cell = makeElement("td", tone);
        const numeric = makeElement("bdi", "position-detail-number", value);
        numeric.dir = "ltr";
        cell.appendChild(numeric);
        row.appendChild(cell);
      });
      row.appendChild(
        makeElement(
          "td",
          "position-partial-date",
          positionDetailDateTime(exit.date, exit.time),
        ),
      );
      body.appendChild(row);
    });
    table.appendChild(body);
    scroll.appendChild(table);
    card.appendChild(scroll);
    const feeNote =
      trade.status === "open"
        ? "خالص جزئی تا اکنون: " +
          displayMoney(partials.netPnlToDate, trade.accountCurrency) +
          " · " +
          displayR(partialNetR(partials)) +
          ". کل کارمزد ثبت‌شدهٔ پوزیشن (" +
          displayMoney(
            trade.fees,
            trade.feesCurrency || trade.accountCurrency,
          ) +
          ") فقط یک‌بار کسر شده است. این پوزیشن تا بسته‌شدن کامل وارد نرخ برد و عملکرد معاملات بسته نمی‌شود."
        : "در نتیجهٔ نهایی پوزیشن، خروج‌های جزئی و خروج حجم باقی‌مانده با هم محاسبه می‌شوند؛ کل کارمزد ثبت‌شده فقط یک‌بار از مجموع کسر می‌شود.";
    card.appendChild(makeElement("p", "position-partial-note", feeNote));
    return card;
  };
  function renderTradeDetail(tradeId) {
    const generation = ++tradeDetailRenderGeneration;
    const page = $("#trade-detail-page");
    const content = $("#trade-detail-content");
    const title = $("#trade-detail-title");
    const subtitle = $("#trade-detail-subtitle");
    const badges = $("#trade-detail-badges");
    const editButton = $("#trade-detail-edit");
    const closeButton = $("#trade-detail-close");
    if (!page || !content) return null;
    const trade = state.trades.find((item) => item.id === tradeId);
    page.dataset.tradeId = trade?.id || "";
    content.replaceChildren();
    badges.replaceChildren();
    editButton.onclick = null;
    closeButton.onclick = null;
    editButton.hidden = !trade;
    closeButton.hidden = !trade || trade.status === "closed";
    if (!trade) {
      title.textContent = "پوزیشن پیدا نشد";
      document.title = "پوزیشن پیدا نشد | ژورنال اِج";
      subtitle.textContent =
        "ممکن است این پوزیشن حذف شده باشد یا متعلق به محیط دیگری باشد.";
      content.appendChild(
        makeElement(
          "p",
          "position-detail-not-found",
          "از «بازگشت به معاملات» پوزیشن دیگری را باز کن.",
        ),
      );
      return null;
    }
    title.textContent = trade.symbol;
    document.title = trade.symbol + " | جزئیات پوزیشن | ژورنال اِج";
    subtitle.textContent =
      accountName(trade.accountId) +
      " · " +
      labelFor("marketType", trade.marketType) +
      " · ورود " +
      positionDetailDateTime(trade.openDate, trade.openTime);
    const plan = calculatePlan(trade);
    const result =
      trade.status === "closed" ? calculateClosed(trade, plan) : null;
    const executed = trade.status !== "planned";
    const maxR = calculateMaxTouchedR(trade);
    const partials = calculatePartialExits(trade, plan);
    const hasPartials = hasTradePartialExits(trade);
    const openPartial =
      trade.status === "open" && hasPartials && partials.valid;
    const knownResult = result?.valid === true;
    const visibleNet = knownResult
      ? result.netPnl
      : openPartial
        ? partials.netPnlToDate
        : null;
    const visibleR = knownResult
      ? result.realizedR
      : openPartial
        ? partialNetR(partials)
        : null;
    const resultTone = visibleNet === null ? "" : partialCashTone(visibleNet);
    badges.append(
      badge(labelFor("status", trade.status), trade.status),
      badge(labelFor("direction", trade.direction), trade.direction),
    );
    if (knownResult)
      badges.appendChild(
        badge(labelFor("outcome", result.outcome), result.outcome),
      );
    editButton.onclick = async () => await editTradeFromDetail(trade, false);
    closeButton.onclick = async () => await editTradeFromDetail(trade, true);
    const metrics = makeElement("div", "position-detail-metrics");
    metrics.append(
      positionDetailMetric(
        openPartial
          ? "خالص خروج‌های جزئی تا اکنون"
          : "سود / زیان خالص تحقق‌یافته",
        visibleNet !== null
          ? displayMoney(visibleNet, trade.accountCurrency)
          : trade.status === "closed"
            ? "قابل محاسبه نیست"
            : "هنوز تحقق نیافته",
        openPartial
          ? "پس از کسر کل کارمزد ثبت‌شده، یک‌بار · نتیجهٔ نهایی پوزیشن نیست"
          : knownResult
            ? "پس از کسر کارمزد همین پوزیشن"
            : trade.status === "closed"
              ? "اطلاعات قیمت، حجم و ریسک پوزیشن را بررسی کن"
              : trade.status === "planned"
                ? "پوزیشن هنوز اجرا نشده است"
                : "پس از ثبت خروج محاسبه می‌شود",
        resultTone,
        true,
        visibleNet === null,
      ),
      positionDetailMetric(
        openPartial ? "R خالص خروج‌های جزئی تا اکنون" : "R واقعی همین پوزیشن",
        visibleR !== null ? displayR(visibleR) : "ثبت نشده",
        "سود یا زیان خالص ÷ ریسک اولیهٔ همین پوزیشن",
        "",
        true,
        visibleR === null,
      ),
      positionDetailMetric(
        "بیشترین R لمس‌شده",
        maxR === null ? "ثبت نشده" : displayR(maxR),
        executed
          ? "بیشترین سود باز ÷ ریسک اولیه؛ پیش از کارمزد" +
              (trade.status === "open" ? " · تا آخرین ثبت" : "")
          : "پس از اجرا و ثبت بیشترین سود باز محاسبه می‌شود",
        "is-peak",
        true,
        maxR === null,
      ),
      positionDetailMetric(
        "R/R برنامهٔ اولیه",
        positionDetailNumber(trade.plannedRR, displayRR),
        "نسبت پاداش به ریسک ذخیره‌شدهٔ همین پوزیشن",
        "",
        true,
        !Number.isFinite(trade.plannedRR),
      ),
    );
    content.appendChild(metrics);
    const partialCard = positionDetailPartials(trade, partials);
    if (partialCard) content.appendChild(partialCard);
    const execution = positionDetailCard("قیمت‌ها و اجرای پوزیشن");
    positionDetailData(execution, [
      ["حساب پوزیشن", accountName(trade.accountId)],
      ["قیمت ورود", positionDetailNumber(trade.entry, displayPrice), true],
      ["حد ضرر", positionDetailNumber(trade.stop, displayPrice), true],
      ["هدف", positionDetailNumber(trade.target, displayPrice), true],
      ["حجم / تعداد", positionDetailNumber(trade.quantity, displayPrice), true],
      [
        hasPartials ? "قیمت خروج حجم باقی‌مانده" : "قیمت خروج",
        trade.status === "closed"
          ? hasPartials && partials.valid && partials.remainingPercent === 0
            ? "تمام حجم با خروج‌های جزئی بسته شده"
            : positionDetailNumber(trade.exit, displayPrice)
          : "هنوز بسته نشده",
        trade.status === "closed" &&
          !(hasPartials && partials.valid && partials.remainingPercent === 0),
      ],
      [
        "تاریخ و ساعت ورود",
        positionDetailDateTime(trade.openDate, trade.openTime),
      ],
      [
        "تاریخ و ساعت خروج",
        trade.status === "closed"
          ? positionDetailDateTime(trade.closeDate, trade.closeTime)
          : "هنوز بسته نشده",
      ],
      [
        "مدت نگهداری",
        trade.status === "closed"
          ? displayDuration(tradeDurationMinutes(trade))
          : trade.status === "planned"
            ? "هنوز شروع نشده"
            : "پوزیشن هنوز باز است",
      ],
    ]);
    positionDetailData(execution, [
      ["واحد حجم", trade.instrument?.quantityUnit],
      ["ضریب قرارداد", trade.instrument?.multiplier, true],
      ["ارز قیمت", trade.instrument?.quoteCurrency],
      ["ارز حساب", trade.accountCurrency],
      ["تبدیل اولیه", trade.entryFxRate, true],
      ["تبدیل خروج نهایی", trade.exitFxRate, true],
    ]);
    const risk = positionDetailCard(
      "ریسک، سود و مسیر پوزیشن",
      "مبالغ سود باز قبل از کارمزد هستند. مقدار ثبت‌نشده صفر فرض نمی‌شود.",
    );
    positionDetailData(risk, [
      [
        "ریسک اولیهٔ ذخیره‌شده",
        positionDetailNumber(trade.plannedRisk, (value) =>
          displayMoney(value, trade.accountCurrency),
        ),
        true,
      ],
      [
        "پاداش برنامهٔ اولیه",
        positionDetailNumber(trade.plannedReward, (value) =>
          displayMoney(value, trade.accountCurrency),
        ),
        true,
      ],
      [
        "R/R برنامهٔ اولیه",
        positionDetailNumber(trade.plannedRR, displayRR),
        true,
      ],
      [
        openPartial ? "ناخالص خروج‌های جزئی تا اکنون" : "سود / زیان ناخالص",
        knownResult
          ? displayMoney(result.grossPnl, trade.accountCurrency)
          : openPartial
            ? displayMoney(partials.grossPnl, trade.accountCurrency)
            : trade.status === "closed"
              ? "قابل محاسبه نیست"
              : "تحقق نیافته",
        knownResult || openPartial,
      ],
      [
        executed
          ? openPartial
            ? "کل کارمزد ثبت‌شده تا اکنون (یک‌بار)"
            : "کل کارمزد ثبت‌شده (یک‌بار)"
          : "کارمزد برآوردی",
        positionDetailNumber(trade.fees, (value) =>
          displayMoney(value, trade.feesCurrency || trade.accountCurrency),
        ),
        true,
      ],
      [
        openPartial ? "خالص خروج‌های جزئی تا اکنون" : "سود / زیان خالص",
        visibleNet !== null
          ? displayMoney(visibleNet, trade.accountCurrency)
          : trade.status === "closed"
            ? "قابل محاسبه نیست"
            : "تحقق نیافته",
        visibleNet !== null,
        resultTone,
      ],
      [
        "بیشترین سود باز (MFE)",
        executed
          ? positionDetailNumber(trade.maxUnrealizedProfit, (value) =>
              displayMoney(value, trade.accountCurrency),
            )
          : "هنوز اجرا نشده",
        executed,
      ],
      [
        "بیشترین زیان باز (MAE)",
        executed
          ? positionDetailNumber(trade.maxUnrealizedLoss, (value) =>
              displayMoney(value, trade.accountCurrency),
            )
          : "هنوز اجرا نشده",
        executed,
      ],
      [
        "بیشترین R/R لمس‌شده",
        maxR === null ? "ثبت نشده" : displayRR(maxR),
        maxR !== null,
      ],
    ]);
    const grid = makeElement("div", "position-detail-grid");
    grid.append(execution, risk);
    content.appendChild(grid);
    content.appendChild(positionTimeframeDirectionCard(trade));
    const factors = positionDetailCard(
      "ستاپ‌ها، تأییدیه‌ها و وضعیت ذهنی",
      "همهٔ انتخاب‌های ثبت‌شده برای همین پوزیشن، همراه توضیح فعلی هر گزینه.",
    );
    const factorGrid = makeElement("div", "position-detail-factor-grid");
    [
      ["strategy", "ستاپ‌ها"],
      ["confirmations", "تأییدیه‌های ورود"],
      ["timeframe", "تایم‌فریم‌ها"],
      ["session", "سشن‌ها"],
      ["emotion", "حالت‌های ذهنی"],
      ["mistakeType", "اشتباه‌ها"],
      ["marketType", "نوع بازار"],
      ["planFollowed", "پایبندی به پلن"],
    ].forEach(([group, label]) =>
      factorGrid.appendChild(positionDetailOptions(trade, group, label)),
    );
    factors.appendChild(factorGrid);
    positionDetailData(factors, [
      [
        "کیفیت ستاپ",
        trade.setupQuality == null
          ? "ثبت نشده"
          : displayNumber(trade.setupQuality, 0) + " از ۵",
      ],
      [
        "اعتماد به تصمیم",
        trade.confidence == null
          ? "ثبت نشده"
          : displayNumber(trade.confidence, 0) + " از ۵",
      ],
    ]);
    content.appendChild(factors);
    const writing = makeElement("div", "position-detail-grid");
    writing.style.marginTop = "16px";
    [
      ["دلیل ورود", trade.entryReason],
      ["دلیل خروج", trade.exitReason],
      ["درس و نکتهٔ این پوزیشن", trade.lesson],
      ["یادداشت‌ها", trade.notes],
    ].forEach(([label, value]) => {
      const card = positionDetailCard(label);
      card.appendChild(
        makeElement(
          "p",
          value ? "position-detail-text" : "position-detail-empty",
          positionDetailText(value),
        ),
      );
      writing.appendChild(card);
    });
    content.appendChild(writing);
    const gallery = positionDetailImageGallery(trade, generation);
    positionDetailData(gallery, [
      ["مرجع تصویر / لینک ثبت‌شده", positionDetailText(trade.screenshotRef)],
    ]);
    content.appendChild(gallery);
    const metadata = makeElement("footer", "position-detail-metadata");
    const idLabel = makeElement("span", "", "شناسهٔ پوزیشن: ");
    idLabel.appendChild(makeElement("bdi", "position-detail-number", trade.id));
    metadata.append(
      idLabel,
      makeElement(
        "span",
        "",
        "ایجاد: " + positionDetailRecordedAt(trade.createdAt),
      ),
      makeElement(
        "span",
        "",
        "آخرین ویرایش: " + positionDetailRecordedAt(trade.updatedAt),
      ),
    );
    content.appendChild(metadata);
    return trade;
  }
  const TRADES_PER_PAGE = 25;
  let tradeListPage = 1;
  let tradeListSource = [];
  let tradePaginationInitialized = false;
  const resetTradePagination = () => {
    tradeListPage = 1;
  };
  const closeTradeActionMenus = (restoreFocus = false, except = null) => {
    document
      .querySelectorAll("details.trade-action-menu[open]")
      .forEach((menu) => {
        if (menu === except) return;
        menu.open = false;
        menu.querySelector("summary")?.setAttribute("aria-expanded", "false");
        if (restoreFocus) menu.querySelector("summary")?.focus();
      });
  };
  const makeTradeActions = (trade) => {
    const menu = makeElement("details", "trade-action-menu");
    const trigger = makeElement("summary", "trade-action-trigger");
    trigger.dataset.heroicon = "ellipsis";
    window.EdgeIcons?.apply(trigger);
    trigger.setAttribute("aria-label", "عملیات پوزیشن " + trade.symbol);
    trigger.setAttribute("aria-expanded", "false");
    const items = makeElement("div", "trade-action-items");
    const addAction = (label, description, callback, className = "") => {
      const action = actionButton(
        label,
        description,
        () => {
          menu.open = false;
          trigger.setAttribute("aria-expanded", "false");
          callback();
        },
        className,
      );
      const actionIcon = {
        ویرایش: "edit",
        بستن: "check",
        کپی: "duplicate",
        حذف: "trash",
      }[label];
      if (actionIcon) window.EdgeIcons?.decorate(action, actionIcon);
      items.appendChild(action);
    };
    addAction(
      "ویرایش",
      "ویرایش معاملهٔ " + trade.symbol,
      async () => await openTradeEditor(trade),
    );
    if (trade.status !== "closed")
      addAction(
        "بستن",
        "ثبت نتیجهٔ معاملهٔ " + trade.symbol,
        async () => await openTradeEditor(trade, true),
      );
    addAction(
      "کپی",
      "کپی معاملهٔ " + trade.symbol,
      async () => await duplicateTrade(trade),
    );
    addAction(
      "حذف",
      "حذف معاملهٔ " + trade.symbol,
      async () => await deleteTrade(trade),
      "delete",
    );
    menu.append(trigger, items);
    menu.addEventListener("toggle", () => {
      trigger.setAttribute("aria-expanded", String(menu.open));
      if (!menu.open) return;
      closeTradeActionMenus(false, menu);
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(192, window.innerWidth - 16);
      items.classList.add("is-positioned");
      items.style.width = width + "px";
      items.style.left =
        Math.max(
          8,
          Math.min(rect.right - width, window.innerWidth - width - 8),
        ) + "px";
      items.style.top = Math.max(8, rect.bottom + 4) + "px";
      const menuHeight = items.getBoundingClientRect().height;
      if (rect.bottom + menuHeight + 12 > window.innerHeight)
        items.style.top = Math.max(8, rect.top - menuHeight - 4) + "px";
    });
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.open) {
        event.preventDefault();
        event.stopPropagation();
        menu.open = false;
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
      }
    });
    return menu;
  };
  const tradeNumber = (text, className = "cell-primary") => {
    const number = makeElement("bdi", className + " trade-table-value", text);
    number.dir = "ltr";
    return number;
  };
  const tradeStatusBadge = (trade, result) => {
    const outcome = result?.valid ? result.outcome : "";
    const text =
      labelFor("status", trade.status) +
      (outcome ? " · " + labelFor("outcome", outcome) : "");
    return badge(text, outcome || trade.status);
  };
  const tradeSetupLabels = (trade) => {
    const labels = optionTradeValues(trade, "strategy").map((value) =>
      labelFor("strategy", value),
    );
    const wrapper = makeElement("div", "trade-setup-labels");
    if (!labels.length)
      wrapper.appendChild(
        makeElement("span", "cell-secondary", "ستاپ بدون نام"),
      );
    labels
      .slice(0, 2)
      .forEach((label) =>
        wrapper.appendChild(makeElement("span", "trade-setup-label", label)),
      );
    if (labels.length > 2) {
      const extra = makeElement(
        "span",
        "trade-setup-extra",
        "+" + displayNumber(labels.length - 2),
      );
      extra.setAttribute(
        "aria-label",
        displayNumber(labels.length - 2) +
          " ستاپ دیگر: " +
          labels.slice(2).join("، "),
      );
      extra.title = labels.slice(2).join("، ");
      wrapper.appendChild(extra);
    }
    return wrapper;
  };
  const tradeResultTone = (result) =>
    result?.valid
      ? result.netPnl > 0
        ? "positive"
        : result.netPnl < 0
          ? "negative"
          : ""
      : "muted";
  const tradeDetailLink = (
    trade,
    className = "cell-primary position-detail-link",
  ) => {
    const link = makeElement("a", className, trade.symbol);
    link.href = tradeDetailHref(trade.id);
    link.setAttribute(
      "aria-label",
      "مشاهدهٔ پوزیشن " + trade.symbol + " در " + formatDate(trade.openDate),
    );
    return link;
  };
  const renderTradeMobileCard = (trade, result, maxR) => {
    const card = makeElement("article", "trade-mobile-card");
    card.dataset.tradeId = trade.id;
    const header = makeElement("div", "trade-mobile-header");
    const symbol = makeElement("div", "trade-mobile-symbol");
    symbol.append(tradeDetailLink(trade), tradeStatusBadge(trade, result));
    const thumbnail = createTradeThumbnail(trade);
    if (thumbnail) symbol.appendChild(thumbnail);
    header.append(symbol, makeTradeActions(trade));
    const meta = makeElement(
      "p",
      "trade-mobile-meta",
      [
        formatDate(trade.openDate),
        trade.openTime ? formatPersianTime(trade.openTime) : "",
        accountName(trade.accountId),
        labelFor("direction", trade.direction),
      ]
        .filter(Boolean)
        .join(" · "),
    );
    const metrics = makeElement("dl", "trade-mobile-metrics");
    const addMetric = (label, value, secondary = "", tone = "") => {
      const group = makeElement("div", "trade-mobile-metric");
      group.appendChild(makeElement("dt", "cell-secondary", label));
      const detail = makeElement("dd", "");
      detail.appendChild(tradeNumber(value, "cell-primary " + tone));
      if (secondary)
        detail.appendChild(tradeNumber(secondary, "cell-secondary"));
      group.appendChild(detail);
      metrics.appendChild(group);
    };
    addMetric("R/R پلن", displayRR(trade.plannedRR));
    addMetric(
      "بیشترین R",
      maxR === null ? "ثبت نشده" : displayR(maxR),
      "",
      maxR === null ? "is-unknown" : "",
    );
    const partials = calculatePartialExits(trade);
    const openPartial =
      trade.status === "open" && hasTradePartialExits(trade) && partials.valid;
    addMetric(
      openPartial ? "خالص جزئی تا اکنون" : "نتیجهٔ خالص",
      result?.valid
        ? displayMoney(result.netPnl, trade.accountCurrency)
        : openPartial
          ? displayMoney(partials.netPnlToDate, trade.accountCurrency)
          : "—",
      result?.valid
        ? displayR(result.realizedR)
        : openPartial
          ? displayR(partialNetR(partials))
          : "",
      result?.valid
        ? tradeResultTone(result)
        : openPartial
          ? partialCashTone(partials.netPnlToDate)
          : "muted",
    );
    card.append(header, meta, tradeSetupLabels(trade), metrics);
    const partialMarker = tradePartialMarker(trade, partials);
    if (partialMarker) card.appendChild(partialMarker);
    return card;
  };
  const renderTable = (trades) => {
    tradeThumbnailObserver?.disconnect();
    tradeThumbnailObserver =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver(
            (entries) =>
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  tradeThumbnailObserver.unobserve(entry.target);
                  entry.target._loadThumbnail?.();
                }
              }),
            {
              rootMargin: "300px",
            },
          )
        : null;
    closeTradeActionMenus();
    tradeListSource = trades;
    const pageCount = Math.max(1, Math.ceil(trades.length / TRADES_PER_PAGE));
    tradeListPage = Math.min(Math.max(1, tradeListPage), pageCount);
    const start = (tradeListPage - 1) * TRADES_PER_PAGE;
    const visibleTrades = trades.slice(start, start + TRADES_PER_PAGE);
    const mobile = $("#trade-mobile-cards");
    refs.rows.textContent = "";
    if (mobile) mobile.textContent = "";
    if (!trades.length) {
      const title = state.trades.length
        ? "معامله‌ای با این فیلترها پیدا نشد"
        : "ژورنال آماده است";
      const message = state.trades.length
        ? "فیلترها را تغییر بده یا حذف کن."
        : "از «معامله جدید» اولین پوزیشن را ثبت کن.";
      const row = document.createElement("tr");
      const cell = makeElement("td", "empty-state");
      cell.colSpan = 8;
      cell.append(
        makeElement("strong", "", title),
        makeElement("p", "", message),
      );
      row.appendChild(cell);
      refs.rows.appendChild(row);
      if (mobile) {
        const empty = makeElement("div", "empty-state");
        empty.append(
          makeElement("strong", "", title),
          makeElement("p", "", message),
        );
        mobile.appendChild(empty);
      }
    } else {
      visibleTrades.forEach((trade) => {
        const plan = calculatePlan(trade);
        const result =
          trade.status === "closed" ? calculateClosed(trade, plan) : null;
        const partials = calculatePartialExits(trade, plan);
        const openPartial =
          trade.status === "open" &&
          hasTradePartialExits(trade) &&
          partials.valid;
        const maxR = calculateMaxTouchedR(trade);
        const row = document.createElement("tr");
        row.dataset.tradeId = trade.id;
        const dateCell = document.createElement("td");
        const time = makeElement(
          "time",
          "cell-primary",
          formatDate(trade.openDate),
        );
        time.dateTime = trade.openDate;
        dateCell.appendChild(time);
        if (trade.openTime)
          dateCell.appendChild(
            makeElement(
              "span",
              "cell-secondary",
              formatPersianTime(trade.openTime),
            ),
          );
        const market = document.createElement("td");
        const marketLayout = makeElement("div", "market-with-image");
        const marketInfo = makeElement("div", "market-trade-info");
        marketInfo.append(
          tradeDetailLink(trade),
          makeElement(
            "span",
            "cell-secondary trade-account-label",
            accountName(trade.accountId),
          ),
          makeElement(
            "span",
            "cell-secondary trade-direction",
            labelFor("direction", trade.direction),
          ),
        );
        marketLayout.appendChild(marketInfo);
        const thumbnail = createTradeThumbnail(trade);
        if (thumbnail) marketLayout.appendChild(thumbnail);
        market.appendChild(marketLayout);
        const setup = document.createElement("td");
        setup.appendChild(tradeSetupLabels(trade));
        const status = document.createElement("td");
        status.appendChild(tradeStatusBadge(trade, result));
        const partialMarker = tradePartialMarker(trade, partials);
        if (partialMarker) status.appendChild(partialMarker);
        const rr = document.createElement("td");
        rr.appendChild(tradeNumber(displayRR(trade.plannedRR)));
        const max = makeElement("td", "position-r-cell");
        max.dataset.tradeId = trade.id;
        max.dataset.maxTouchedR = maxR === null ? "" : String(maxR);
        max.title = "اوج سود باز همین پوزیشن ÷ ریسک اولیهٔ خودش؛ پیش از کارمزد";
        max.appendChild(
          tradeNumber(
            maxR === null ? "ثبت نشده" : displayR(maxR),
            "cell-primary position-r-value" +
              (maxR === null ? " is-unknown" : ""),
          ),
        );
        const pnl = document.createElement("td");
        pnl.appendChild(
          tradeNumber(
            result?.valid
              ? displayMoney(result.netPnl, trade.accountCurrency)
              : openPartial
                ? displayMoney(partials.netPnlToDate, trade.accountCurrency)
                : "—",
            "cell-primary " +
              (result?.valid
                ? tradeResultTone(result)
                : openPartial
                  ? partialCashTone(partials.netPnlToDate)
                  : "muted"),
          ),
        );
        if (result?.valid)
          pnl.appendChild(
            tradeNumber(displayR(result.realizedR), "cell-secondary"),
          );
        else if (openPartial) {
          pnl.appendChild(
            tradeNumber(displayR(partialNetR(partials)), "cell-secondary"),
          );
          pnl.appendChild(
            makeElement("span", "cell-secondary", "خالص جزئی تا اکنون"),
          );
        }
        const actions = document.createElement("td");
        actions.appendChild(makeTradeActions(trade));
        row.append(dateCell, market, setup, status, rr, max, pnl, actions);
        refs.rows.appendChild(row);
        if (mobile)
          mobile.appendChild(renderTradeMobileCard(trade, result, maxR));
      });
    }
    refs.tableCount.textContent = trades.length
      ? displayNumber(start + 1) +
        "–" +
        displayNumber(start + visibleTrades.length) +
        " از " +
        displayNumber(trades.length) +
        " معامله"
      : "۰ معامله";
    const previous = $("#trades-prev");
    const next = $("#trades-next");
    const pageLabel = $("#trades-page-label");
    if (previous) previous.disabled = tradeListPage <= 1;
    if (next) next.disabled = tradeListPage >= pageCount;
    if (pageLabel)
      pageLabel.textContent =
        "صفحهٔ " +
        displayNumber(tradeListPage) +
        " از " +
        displayNumber(pageCount);
  };
  const initializeTradePagination = () => {
    if (tradePaginationInitialized) return;
    tradePaginationInitialized = true;
    const changePage = (direction) => {
      const next = tradeListPage + direction;
      const pages = Math.max(
        1,
        Math.ceil(tradeListSource.length / TRADES_PER_PAGE),
      );
      if (next < 1 || next > pages) return;
      tradeListPage = next;
      renderTable(tradeListSource);
      const table = $("#trade-table") || refs.rows.closest("table");
      const mobile = $("#trade-mobile-cards");
      const target =
        window.innerWidth < 768
          ? mobile
          : table?.closest(".table-scroll") || table;
      target?.scrollIntoView({
        behavior: scrollBehavior(),
        block: "start",
      });
      $("#trades-page-label")?.focus({
        preventScroll: true,
      });
    };
    $("#trades-prev")?.addEventListener("click", () => changePage(-1));
    $("#trades-next")?.addEventListener("click", () => changePage(1));
    document.addEventListener("click", (event) => {
      if (!event.target.closest(".trade-action-menu")) closeTradeActionMenus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeTradeActionMenus(true);
    });
    document.addEventListener(
      "scroll",
      (event) => {
        if (!event.target.closest?.(".trade-action-items"))
          closeTradeActionMenus();
      },
      true,
    );
    window.addEventListener("resize", () => closeTradeActionMenus());
  };
  const renderDashboardRecent = (trades) => {
    const list = $("#dashboard-recent");
    if (list) {
      list.textContent = "";
      if (!trades.length)
        list.appendChild(
          makeElement(
            "p",
            "empty-state",
            state.trades.length
              ? "معامله‌ای با فیلترهای فعلی پیدا نشد."
              : "اولین پوزیشن را با «معامله جدید» ثبت کن.",
          ),
        );
      trades.slice(0, 5).forEach((trade) => {
        const row = makeElement("a", "dashboard-recent-item");
        row.href = tradeDetailHref(trade.id);
        row.setAttribute(
          "aria-label",
          "مشاهدهٔ پوزیشن " +
            trade.symbol +
            " در " +
            formatDate(trade.openDate),
        );
        const copy = makeElement("div", "dashboard-recent-copy");
        copy.append(
          makeElement("strong", "", trade.symbol),
          makeElement(
            "span",
            "dashboard-recent-meta",
            [
              formatDate(trade.openDate),
              accountName(trade.accountId),
              labelFor("direction", trade.direction),
            ].join(" · "),
          ),
        );
        const result =
          trade.status === "closed" ? calculateClosed(trade) : null;
        const values = makeElement("div", "dashboard-recent-result");
        values.appendChild(tradeStatusBadge(trade, result));
        if (result?.valid)
          values.append(
            tradeNumber(
              displayMoney(result.netPnl, trade.accountCurrency),
              "cell-primary " + tradeResultTone(result),
            ),
            tradeNumber(displayR(result.realizedR), "cell-secondary"),
          );
        const partials = calculatePartialExits(trade);
        if (
          trade.status === "open" &&
          hasTradePartialExits(trade) &&
          partials.valid
        ) {
          values.append(
            tradeNumber(
              displayMoney(partials.netPnlToDate, trade.accountCurrency),
              "cell-primary " + partialCashTone(partials.netPnlToDate),
            ),
            makeElement("span", "cell-secondary", "خالص جزئی تا اکنون"),
          );
        }
        const partialMarker = tradePartialMarker(trade, partials);
        if (partialMarker) copy.appendChild(partialMarker);
        row.append(copy, values);
        list.appendChild(row);
      });
    }
    const open = $("#dashboard-open-count");
    const planned = $("#dashboard-planned-count");
    if (open)
      open.textContent = displayNumber(
        trades.filter((trade) => trade.status === "open").length,
      );
    if (planned)
      planned.textContent = displayNumber(
        trades.filter((trade) => trade.status === "planned").length,
      );
  };
  const TOUCHED_R_THRESHOLDS = Object.freeze([
    0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10,
  ]);
  const summarizeTouchedRReach = (trades) => {
    const executed = trades.filter(
      (trade) => trade.status === "closed" || trade.status === "open",
    );
    const known = executed.filter(
      (trade) => calculateMaxTouchedR(trade) !== null,
    );
    return {
      knownCount: known.length,
      knownClosed: known.filter((trade) => trade.status === "closed").length,
      knownOpen: known.filter((trade) => trade.status === "open").length,
      unknownCount: executed.length - known.length,
      plannedCount: trades.filter((trade) => trade.status === "planned").length,
      rows: TOUCHED_R_THRESHOLDS.map((threshold) => {
        const reached = known.filter((trade) => hasTouchedR(trade, threshold));
        const performance = summarizePerformance(closedResults(reached));
        return {
          threshold,
          count: reached.length,
          reachRate: known.length
            ? (reached.length / known.length) * 100
            : null,
          closed: reached.filter((trade) => trade.status === "closed").length,
          open: reached.filter((trade) => trade.status === "open").length,
          wins: performance.wins,
          losses: performance.losses,
          breakevens: performance.breakevens,
          winRate: performance.winRate,
          avgR: performance.avgR,
        };
      }),
    };
  };
  const renderTouchedRAnalysis = (trades) => {
    const summary = summarizeTouchedRReach(trades);
    const minimum = $("#filter-touched-r-min").value;
    const context = $("#touched-r-context");
    context.textContent =
      "مبنای درصد رسیدن: " +
      displayNumber(summary.knownCount) +
      " معامله با سود باز و ریسک اولیهٔ معتبر (" +
      displayNumber(summary.knownClosed) +
      " بسته + " +
      displayNumber(summary.knownOpen) +
      " باز). " +
      displayNumber(summary.unknownCount) +
      " معامله بدون دادهٔ معتبر و " +
      displayNumber(summary.plannedCount) +
      " پلن از مبنا کنار گذاشته شده‌اند." +
      (minimum !== ""
        ? " شرط حداقل " +
          displayNumber(Number(minimum), 1) +
          "R فعال است؛ درصدها در همین نمونهٔ فیلترشده محاسبه می‌شوند."
        : "") +
      (summary.knownOpen
        ? " بیشترین R معاملات باز تا زمان آخرین ثبت است و ممکن است افزایش یابد."
        : "");
    context.classList.toggle("factor-warning", minimum !== "");
    const body = $("#touched-r-rows");
    body.textContent = "";
    body.dataset.summary = JSON.stringify(summary);
    summary.rows.forEach((level) => {
      const row = document.createElement("tr");
      row.dataset.threshold = String(level.threshold);
      row.dataset.active = String(
        minimum !== "" && Number(minimum) === level.threshold,
      );
      const values = [
        ["≥ " + displayNumber(level.threshold, 1) + "R", "touched-r-threshold"],
        [displayNumber(level.count), ""],
        [
          level.reachRate === null
            ? "—"
            : displayNumber(level.reachRate, 1) + "٪",
          "touched-r-rate",
        ],
        [displayNumber(level.closed) + " / " + displayNumber(level.open), ""],
        [
          displayNumber(level.wins) +
            " / " +
            displayNumber(level.losses) +
            " / " +
            displayNumber(level.breakevens),
          "",
        ],
        [
          level.winRate === null ? "—" : displayNumber(level.winRate, 1) + "٪",
          "",
        ],
        [displayR(level.avgR), ""],
      ];
      values.forEach(([value, className]) =>
        row.appendChild(makeElement("td", className, value)),
      );
      const action = document.createElement("td");
      const button = makeElement("button", "button ghost small", "حداقل این R");
      button.type = "button";
      button.setAttribute(
        "aria-label",
        "فیلتر معاملات با حداقل " +
          displayNumber(level.threshold, 1) +
          "R لمس‌شده",
      );
      button.disabled = summary.knownCount === 0;
      button.addEventListener("click", () => {
        $("#filter-touched-r-min").value = String(level.threshold);
        syncAllListboxes();
        renderAll();
        revealReportFilters();
        $("#shared-trade-filters").scrollIntoView({
          behavior: scrollBehavior(),
          block: "start",
        });
      });
      action.appendChild(button);
      row.appendChild(action);
      body.appendChild(row);
    });
  };
  const renderAll = () => {
    syncTradePaginationWithFilters();
    refreshAccountUI();
    const filtered = getFilteredTrades();
    renderFilterChips();
    if (currentView === "dashboard") {
      if (filtered.length < 2000) renderMetrics(filtered);
      else $("#metric-live").textContent = "در حال محاسبهٔ گزارش…";
      renderDashboardRecent(filtered);
    }
    if (currentView === "trades") {
      refreshConfirmationFilter();
      refreshFactorFilters();
      renderTable(filtered);
    }
    if (currentView === "analytics") {
      refreshConfirmationFilter();
      refreshFactorFilters();
      renderFilteredSummary(filtered);
      renderTouchedRAnalysis(filtered);
      renderAnalytics(filtered);
    }
    if (currentView === "charts") renderWinRateCharts(filtered);
    if (currentView === "accounts") renderAccountOverview();
    if (currentView === "trade") renderTradeDetail(activeTradeDetailId);
    if (
      ["dashboard", "trades", "analytics", "charts", "accounts"].includes(
        currentView,
      )
    )
      void services.report(filtered, {
        search: "",
        accountId: currentView === "accounts" ? undefined : activeAccountScope,
      });
    else services.cancelReport();
  };
  globalThis.addEventListener("edge-report", (event) => {
    if (currentView === "dashboard" && event.detail.result)
      renderMetrics(getFilteredTrades(), event.detail.result);
    if (event.detail.error)
      $("#metric-live").textContent = "گزارش کامل نشد: " + event.detail.error;
    document.documentElement.dataset.reportRevision = String(
      event.detail.revision,
    );
    document.documentElement.dataset.reportQuery = String(event.detail.id);
  });
  const resetFilters = () => {
    refs.filterSymbol.value = "";
    exactFactorSymbol = null;
    refs.filterDirection.value = "all";
    refs.filterStatus.value = "all";
    refs.filterSession.value = "all";
    selectedFactorConfirmations.clear();
    refs.filterConfirmationMode.value = "all";
    $("#filter-touched-r-min").value = "";
    factorDefinitions.forEach(([key]) => ($("#factor-" + key).value = ""));
    setPersianDateInput(refs.filterFrom, "");
    setPersianDateInput(refs.filterTo, "");
    refs.toDateWrap.classList.add("is-hidden");
    refs.toggleToDate.textContent = "+ تاریخ پایان";
    refs.toggleToDate.setAttribute("aria-expanded", "false");
    syncAllListboxes();
    renderAll();
  };
  const showToast = (message, error = false) => {
    if (!refs.toastRegion) return;
    const toast = makeElement(
      "div",
      "toast" + (error ? " error" : ""),
      message,
    );
    toast.setAttribute("role", error ? "alert" : "status");
    refs.toastRegion.appendChild(toast);
    setTimeout(() => toast.remove(), 5200);
  };
  const download = (filename, content, type) => {
    const blob = new Blob([content], {
      type,
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportJSON = async () => {
    try {
      await services.exportJSON();
    } catch (error) {
      showToast(error.message, true);
    }
  };
  const csvTradeValue = (trade, column) => {
    trade = services.preciseFormTrade(trade);
    if (column === "accountId") return trade.accountId;
    if (column === "accountName")
      return getAccountById(trade.accountId)?.name || trade.accountId;
    if (column === "maxTouchedR") return calculateMaxTouchedR(trade);
    if (column === "timeframeDirections")
      return JSON.stringify(
        trade.timeframeDirections || normalizeTimeframeDirections(),
      );
    if (column === "confirmationValues")
      return JSON.stringify(trade.confirmationValues || []);
    if (column === "partialExits")
      return JSON.stringify(trade.partialExits || []);
    if (["instrument", "initialPlan", "fills"].includes(column))
      return JSON.stringify(trade[column]);
    if (column === "confirmations")
      return JSON.stringify(trade.confirmations || []);
    const multi = Object.entries(MULTI_OPTION_FIELDS).find(
      ([, plural]) => column === plural || column === plural + "Labels",
    );
    if (multi) {
      const values = optionTradeValues(trade, multi[0]);
      return JSON.stringify(
        column.endsWith("Labels")
          ? values.map((value) => labelFor(multi[0], value))
          : values,
      );
    }
    return column.endsWith("Label")
      ? labelFor(column.slice(0, -5), trade[column.slice(0, -5)])
      : trade[column];
  };
  const exportCSV = () => {
    const rows = [CSV_COLUMNS.map(csvEscape).join(",")];
    state.trades
      .slice()
      .sort((a, b) => b.openDate.localeCompare(a.openDate))
      .forEach((trade) =>
        rows.push(
          CSV_COLUMNS.map((column) =>
            csvEscape(csvTradeValue(trade, column)),
          ).join(","),
        ),
      );
    download(
      (IS_DEMO ? "edge-journal-demo-" : "edge-journal-") + today() + ".csv",
      rows.join("\r\n"),
      "text/csv;charset=utf-8",
    );
    showToast(
      "فایل CSV با " +
        displayNumber(state.trades.length) +
        " معامله ساخته شد؛ تصاویر در خروجی JSON قرار می‌گیرند.",
    );
  };
  const importJSONFile = async (file) => {
    try {
      if (!(await confirmDraftReplacement())) return;
      const parsed = await services.parseJSONFile(file);
      if (
        !parsed ||
        ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, VERSION].includes(
          parsed.version,
        ) ||
        !Array.isArray(parsed.trades) ||
        parsed.catalogOnly
      )
        throw new Error("این فایل پشتیبان کامل ژورنال نیست.");
      const saved = await services.importJSON(
        parsed,
        validateTradeImageAsset,
        verifyTradeImageDimensions,
      );
      if (!saved) return;
      state = saved;
      generalSettingsDirty = false;
      setGeneralSettingsMessage("");
      refreshAccountUI();
      syncSettingsUI(true);
      syncProjectionDefaults();
      resetFilters();
      resetForm(false);
      renderAll();
      renderProjection();
      showToast("پشتیبان کامل بازیابی شد.");
    } catch (error) {
      services.progress("ورود JSON ناموفق بود: " + error.message, true);
      showToast("ورود JSON ناموفق بود: " + error.message, true);
    } finally {
      refs.jsonFile.value = "";
    }
  };

  // CSV account IDs are authoritative. Importing a label never renames an existing account.
  const resolveCSVAccount = (
    raw,
    accounts,
    fallbackId = DEFAULT_ACCOUNT_ID,
    settings = state.settings,
  ) => {
    const id = normalizeAccountId(raw.accountId);
    const name = clampText(raw.accountName, 80);
    if (id) {
      if (!getAccountById(id, accounts))
        accounts.push({
          ...defaultAccount(settings),
          id,
          name:
            name ||
            (id === DEFAULT_ACCOUNT_ID
              ? "حساب اصلی"
              : "حساب واردشده · " + id.slice(0, 32)),
          currency: raw.accountCurrency || settings.currency || "USD",
        });
      return id;
    }
    if (name) {
      const existing = accounts.find((account) => account.name === name);
      if (existing) return existing.id;
      const importedId = "account-" + makeId();
      accounts.push({
        ...defaultAccount(settings),
        id: importedId,
        name,
        currency: raw.accountCurrency || settings.currency || "USD",
      });
      return importedId;
    }
    return (
      getAccountById(fallbackId, accounts)?.id ||
      accounts.find((account) => !account.archived)?.id ||
      accounts[0]?.id ||
      DEFAULT_ACCOUNT_ID
    );
  };
  const importCSVFile = async (file) => {
    try {
      services.validateFileSize(file.size, "csv");
      services.progress("در حال خواندن و بررسی ردیف‌های CSV…");
      const rows = await services.parseText(await file.text(), "csv");
      if (rows.length > 100001)
        throw new Error("حداکثر ورود ۱۰۰٬۰۰۰ رکورد است.");
      if (rows.length < 2)
        throw new Error("فایل CSV هیچ ردیف معامله‌ای ندارد.");
      const headers = rows[0].map((header) =>
        header.trim().replace(/^\uFEFF/, ""),
      );
      if (
        new Set(headers).size !== headers.length ||
        headers.some(
          (header) =>
            !header ||
            header === "__proto__" ||
            header === "constructor" ||
            header === "prototype",
        )
      )
        throw new Error("نام ستون CSV تکراری یا نامعتبر است.");
      const required = [
        "status",
        "openDate",
        "symbol",
        "direction",
        "entry",
        "stop",
        "target",
        "quantity",
      ];
      const missing = required.filter((column) => !headers.includes(column));
      if (missing.length)
        throw new Error("ستون‌های ضروری وجود ندارند: " + missing.join(", "));
      const knownIds = new Set(state.trades.map((trade) => trade.id));
      const newIds = new Set();
      const valid = [];
      const optionSources = [];
      let importedAccounts = state.accounts.map((account) => ({
        ...account,
      }));
      const fallbackAccountId = getDefaultTradeAccountId();
      const errors = [];
      let duplicates = 0;
      for (let index = 1; index < rows.length; index++) {
        const raw = Object.create(null);
        headers.forEach((header, columnIndex) => {
          raw[header] = csvUnescape(rows[index][columnIndex] ?? "");
        });
        try {
          if (rows[index].length !== headers.length)
            throw new Error("تعداد ستون‌ها با سرستون سازگار نیست.");
          for (const field of ["instrument", "initialPlan", "fills"])
            if (raw[field]) raw[field] = JSON.parse(raw[field]);
            else delete raw[field];
          if (
            raw.accountCurrency &&
            !/^[A-Z0-9]{1,8}$/.test(raw.accountCurrency)
          )
            throw new Error("ارز حساب معتبر نیست.");
        } catch (error) {
          errors.push(
            "ردیف " + displayNumber(index + 1) + ": " + error.message,
          );
          continue;
        }
        const candidateAccounts = importedAccounts.map((account) => ({
          ...account,
        }));
        raw.accountId = resolveCSVAccount(
          raw,
          candidateAccounts,
          fallbackAccountId,
        );
        const account = candidateAccounts.find(
          (account) => account.id === raw.accountId,
        );
        if (
          raw.accountCurrency &&
          account?.currency &&
          raw.accountCurrency !== account.currency
        ) {
          errors.push(
            "ردیف " +
              displayNumber(index + 1) +
              ": ارز حساب با حساب موجود یکسان نیست.",
          );
          continue;
        }
        if (account && raw.accountCurrency)
          account.currency = raw.accountCurrency;
        const result = normalizeTrade(
          raw,
          sanitizeOptions(state.options, [raw]),
        );
        if (!result.trade) {
          errors.push(
            "ردیف " + displayNumber(index + 1) + ": " + result.errors[0],
          );
          continue;
        }
        if (knownIds.has(result.trade.id) || newIds.has(result.trade.id)) {
          duplicates++;
          continue;
        }
        newIds.add(result.trade.id);
        importedAccounts = candidateAccounts;
        valid.push(result.trade);
        optionSources.push({
          ...raw,
          ...result.trade,
        });
      }
      if (valid.length) {
        if (
          !(await services.preview(
            valid.length +
              " ردیف معتبر اضافه شود؟ " +
              duplicates +
              " تکراری و " +
              errors.length +
              " نامعتبر وارد نمی‌شود. " +
              (importedAccounts.length - state.accounts.length) +
              " حساب تازه.\n" +
              errors.slice(0, 10).join("\n"),
            valid,
          ))
        )
          return;
        const options = sanitizeOptions(state.options, optionSources);
        if (
          !(await persist({
            ...state,
            accounts: importedAccounts,
            options,
            trades: [...state.trades, ...valid],
          }))
        )
          return;
        refreshAccountUI();
        refreshManagedOptions();
        renderConfirmationOptions(getSelectedConfirmations());
        renderAll();
      }
      const parts = [displayNumber(valid.length) + " ردیف وارد شد"];
      if (duplicates)
        parts.push(displayNumber(duplicates) + " ردیف تکراری رد شد");
      if (errors.length)
        parts.push(
          displayNumber(errors.length) +
            " ردیف نامعتبر رد شد (" +
            errors.slice(0, 2).join("؛ ") +
            ")",
        );
      showToast(
        "ورود CSV: " + parts.join(" · "),
        errors.length > 0 && valid.length === 0,
      );
    } catch (error) {
      services.progress("ورود CSV ناموفق بود: " + error.message, true);
      showToast("ورود CSV ناموفق بود: " + error.message, true);
    } finally {
      refs.csvFile.value = "";
    }
  };
  const bindEvents = () => {
    refs.form.addEventListener("submit", saveTradeFromForm);
    const handleNativeInvalid = (event) => {
      const messages = {
        "open-date": "تاریخ ورود را وارد کن.",
        "open-time": "ساعت ورود را وارد کن.",
        symbol: "نماد را وارد کن.",
        entry: "قیمت ورود معتبر وارد کن.",
        stop: "حد ضرر معتبر وارد کن.",
        target: "هدف معتبر وارد کن.",
        quantity: "حجم معتبر وارد کن.",
        "close-date": "تاریخ خروج را وارد کن.",
        "close-time": "ساعت خروج را وارد کن.",
        exit: "قیمت خروج معتبر وارد کن.",
        fees: "کارمزد باید صفر یا عدد مثبت باشد.",
        "max-unrealized-profit":
          "بیشترین سود باز باید خالی، صفر یا عدد مثبت باشد.",
        "max-unrealized-loss":
          "بیشترین زیان باز باید خالی، صفر یا عدد مثبت باشد.",
      };
      event.target.setCustomValidity(
        messages[event.target.id] || "این فیلد را درست تکمیل کن.",
      );
      if (!nativeInvalidFocusScheduled) {
        nativeInvalidFocusScheduled = true;
        if (!revealConfirmationField(event.target))
          openAccordionFor(event.target);
        const visible = visibleControlFor(event.target);
        visible.setAttribute("aria-invalid", "true");
        requestAnimationFrame(() =>
          visible.focus({
            preventScroll: true,
          }),
        );
        setTimeout(() => {
          nativeInvalidFocusScheduled = false;
        }, 0);
      }
    };
    refs.form.addEventListener("invalid", handleNativeInvalid, true);
    document.addEventListener(
      "invalid",
      (event) => {
        if (
          event.target.form === refs.form &&
          !refs.form.contains(event.target)
        )
          handleNativeInvalid(event);
      },
      true,
    );
    const clearEditedFieldError = (event) => {
      const control = event.target;
      control.closest?.(".field")?.querySelector(".field-error")?.remove();
      if (control instanceof HTMLElement) {
        const hasLocalizedValidator = control.matches?.(
          "[data-localized-number], [data-persian-time], [data-persian-date]",
        );
        if (
          !hasLocalizedValidator &&
          typeof control.setCustomValidity === "function"
        )
          control.setCustomValidity("");
        if (!hasLocalizedValidator) control.removeAttribute("aria-invalid");
        if (
          control.getAttribute("aria-describedby") === "form-message" ||
          control.getAttribute("aria-describedby")?.endsWith("-error")
        )
          control.removeAttribute("aria-describedby");
        const visible = visibleControlFor(control);
        if (!hasLocalizedValidator) visible.removeAttribute("aria-invalid");
        if (
          visible.getAttribute("aria-describedby") === "form-message" ||
          visible.getAttribute("aria-describedby")?.endsWith("-error")
        )
          visible.removeAttribute("aria-describedby");
      }
    };
    refs.form.addEventListener("input", clearEditedFieldError);
    document.addEventListener("input", (event) => {
      if (
        !event.target.closest?.(".confirmation-popover-panel") ||
        event.target.form !== refs.form
      )
        return;
      clearEditedFieldError(event);
      updateRealizedPreview();
    });
    const confirmationAccordionPanel = $("#accordion-confirmations-panel");
    new MutationObserver(() => {
      if (confirmationAccordionPanel.hidden)
        globalThis.EdgeUI.closeConfirmationPopovers();
    }).observe(confirmationAccordionPanel, {
      attributes: true,
      attributeFilter: ["hidden"],
    });
    const repositionFloatingConfirmationOptions = (event) => {
      if (openListboxController?.select.name !== "confirmationDirection")
        return;
      if (
        event.type === "scroll" &&
        openListboxController.panel?.contains(event.target)
      )
        return;
      requestAnimationFrame(() => {
        if (openListboxController?.select.name === "confirmationDirection")
          openListboxController.positionConfirmationOptions?.();
      });
    };
    document.addEventListener("scroll", repositionFloatingConfirmationOptions, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", repositionFloatingConfirmationOptions);
    $("#trade-account").addEventListener("input", clearEditedFieldError);
    $("#trade-account").addEventListener("change", updateRealizedPreview);
    refs.status.addEventListener("change", () => {
      toggleCloseFields();
      updateRealizedPreview();
    });
    refs.form.addEventListener("input", updateRealizedPreview);
    [refs.entry, refs.stop, refs.target, refs.quantity].forEach((input) =>
      input.addEventListener("input", updateCalculator),
    );
    $$('input[name="direction"]', refs.form).forEach((input) =>
      input.addEventListener("change", updateCalculator),
    );
    [refs.accountBalance, refs.riskPercent, refs.fixedRisk].forEach((input) =>
      input.addEventListener("change", updateCompatibilityAccountBudget),
    );
    [refs.accountBalance, refs.riskPercent, refs.fixedRisk].forEach((input) =>
      input.addEventListener("input", updateCalculator),
    );
    $$('input[name="risk-mode"]').forEach((input) =>
      input.addEventListener("change", updateCompatibilityAccountBudget),
    );
    refs.useSuggested.addEventListener("click", () => {
      if (lastSuggestedSize === null) return;
      setNumericInputValue(
        refs.quantity,
        Number(lastSuggestedSize.toPrecision(12)).toString(),
      );
      refs.quantity.setCustomValidity("");
      updateCalculator();
      refs.quantity.focus();
    });
    $("#reset-form").addEventListener("click", async () => {
      if (await confirmDraftReplacement()) {
        resetForm(true);
        history.replaceState(null, "", "#trade-new");
        applyPageRoute?.(true, true);
      }
    });
    [refs.cancelEdit, $("#cancel-edit-top")].forEach((button) =>
      button.addEventListener("click", async () => {
        if (!(await confirmDraftReplacement())) return;
        resetForm(false);
        await navigateJournalRoute(editorOriginHash);
      }),
    );
    let searchTimer;
    refs.filterSymbol.addEventListener("input", () => {
      exactFactorSymbol = null;
      services.cancelReport();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(renderAll, 120);
    });
    [refs.filterFrom, refs.filterTo].forEach((input) =>
      input.addEventListener("input", renderAll),
    );
    $("#filter-touched-r-min").addEventListener("change", renderAll);
    [
      refs.filterDirection,
      refs.filterStatus,
      refs.filterSession,
      refs.filterConfirmationMode,
      ...$$("select[data-factor]"),
    ].forEach((select) => select.addEventListener("change", renderAll));
    $("#filter-confirmation-options").addEventListener("change", (event) => {
      const input = event.target;
      if (input.name !== "factorConfirmations") return;
      if (input.checked) selectedFactorConfirmations.add(input.value);
      else selectedFactorConfirmations.delete(input.value);
      renderAll();
    });
    $("#clear-confirmation-filters").addEventListener("click", () => {
      selectedFactorConfirmations.clear();
      refs.filterConfirmationMode.value = "all";
      syncAllListboxes();
      renderAll();
    });
    [
      refs.timeAnalysisMode,
      refs.behaviorAnalysisMode,
      refs.analysisTableMode,
    ].forEach((select) =>
      select.addEventListener("change", () =>
        renderAnalytics(getFilteredTrades()),
      ),
    );
    [
      refs.projectionTrades,
      refs.projectionRisk,
      refs.projectionBalance,
    ].forEach((input) => input.addEventListener("input", renderProjection));
    refs.projectionMode.addEventListener("change", renderProjection);
    refs.projectionBody.addEventListener("click", (event) => {
      const button = event.target.closest?.("button[data-rr][data-win-rate]");
      if (!button || !refs.projectionBody.contains(button)) return;
      projectionSelection = {
        rr: Number(button.dataset.rr),
        winRate: Number(button.dataset.winRate),
      };
      renderProjection();
      focusProjectionSelection();
    });
    refs.projectionBody.addEventListener("keydown", (event) => {
      const button = event.target.closest?.("button[data-rr][data-win-rate]");
      if (!button || !refs.projectionBody.contains(button)) return;
      let nextRR = Number(button.dataset.rr);
      let nextWinRate = Number(button.dataset.winRate);
      if (event.key === "ArrowLeft") nextRR = Math.min(15, nextRR + 1);
      else if (event.key === "ArrowRight") nextRR = Math.max(1, nextRR - 1);
      else if (event.key === "ArrowDown")
        nextWinRate = Math.min(80, nextWinRate + 5);
      else if (event.key === "ArrowUp")
        nextWinRate = Math.max(0, nextWinRate - 5);
      else if (event.key === "Home") nextRR = 1;
      else if (event.key === "End") nextRR = 15;
      else return;
      event.preventDefault();
      projectionSelection = {
        rr: nextRR,
        winRate: nextWinRate,
      };
      renderProjection();
      focusProjectionSelection();
    });
    [$("#clear-filters-head")].forEach((button) =>
      button.addEventListener("click", resetFilters),
    );
    refs.toggleToDate.addEventListener("click", () => {
      const opening = refs.toDateWrap.classList.contains("is-hidden");
      refs.toDateWrap.classList.toggle("is-hidden", !opening);
      refs.toggleToDate.setAttribute("aria-expanded", String(opening));
      refs.toggleToDate.textContent = opening
        ? "− حذف تاریخ پایان"
        : "+ تاریخ پایان";
      if (opening) refs.filterTo.focus();
      else {
        setPersianDateInput(refs.filterTo, "");
        renderAll();
      }
    });
    [$("#export-json"), $("#export-json-top")].forEach((button) =>
      button.addEventListener("click", exportJSON),
    );
    $("#export-csv").addEventListener("click", exportCSV);
    [$("#import-json"), $("#import-json-top")].forEach((button) =>
      button.addEventListener("click", () => refs.jsonFile.click()),
    );
    $("#import-csv").addEventListener("click", () => refs.csvFile.click());
    refs.jsonFile.addEventListener(
      "change",
      async () =>
        refs.jsonFile.files[0] &&
        (await importJSONFile(refs.jsonFile.files[0])),
    );
    refs.csvFile.addEventListener(
      "change",
      async () =>
        refs.csvFile.files[0] && (await importCSVFile(refs.csvFile.files[0])),
    );
  };

  // Account scope affects reporting only; the trade form keeps its own account.
  let activeAccountScope = "";
  let accountEditorId = "";
  const accountScopeKey = STORAGE_KEY + ":account-scope";
  const accountName = (id) => getAccountById(id)?.name || "حساب اصلی";
  const accountForTrade = (trade) =>
    getAccountById(trade?.accountId) ||
    getAccountById("account-main") ||
    state.accounts[0] ||
    null;
  const accountChoiceLabel = (account) =>
    account.name + (account.archived ? " (بایگانی‌شده)" : "");
  const getAccountScopeTrades = (trades) =>
    activeAccountScope
      ? trades.filter((trade) => trade.accountId === activeAccountScope)
      : trades;
  const rememberAccountScope = () => {
    try {
      localStorage.setItem(accountScopeKey, activeAccountScope);
    } catch {}
  };
  const setAccountScope = (id) => {
    activeAccountScope = state.accounts.some((account) => account.id === id)
      ? id
      : "";
    rememberAccountScope();
    renderAll();
  };
  const replaceAccountChoices = (select, choices, value, emptyLabel = null) => {
    select.replaceChildren();
    if (emptyLabel !== null) {
      const option = makeElement("option", "", emptyLabel);
      option.value = "";
      select.appendChild(option);
    }
    choices.forEach((account) => {
      const option = makeElement("option", "", accountChoiceLabel(account));
      option.value = account.id;
      select.appendChild(option);
    });
    select.value = value;
  };
  const refreshAccountUI = (
    preferredTradeAccountId = $("#trade-account").value,
  ) => {
    if (
      activeAccountScope &&
      !state.accounts.some((account) => account.id === activeAccountScope)
    ) {
      activeAccountScope = "";
      rememberAccountScope();
    }
    replaceAccountChoices(
      $("#account-scope"),
      state.accounts,
      activeAccountScope,
      "همهٔ حساب‌ها",
    );
    const selected = getAccountById(preferredTradeAccountId);
    const active = state.accounts.filter((account) => !account.archived);
    const choices = state.accounts.filter(
      (account) => !account.archived || account.id === selected?.id,
    );
    const defaultChoice =
      active.find((account) => account.id === activeAccountScope) || active[0];
    replaceAccountChoices(
      $("#trade-account"),
      choices,
      selected?.id || defaultChoice?.id || "",
      choices.length ? null : "ابتدا یک حساب فعال بساز یا بازگردان",
    );
    const tradeAccount = getAccountById($("#trade-account").value);
    $("#trade-account-help").textContent = tradeAccount?.archived
      ? "این حساب بایگانی شده است. معاملهٔ قبلی قابل ویرایش است؛ برای پوزیشن جدید حساب فعال انتخاب کن."
      : "این پوزیشن در حساب انتخاب‌شده ذخیره می‌شود؛ فیلتر نمایش، حساب پوزیشن را تغییر نمی‌دهد.";
    const scope = getAccountById(activeAccountScope);
    $("#account-scope-heading").textContent = scope
      ? accountChoiceLabel(scope)
      : "همهٔ حساب‌ها";
    $("#account-scope-context").textContent =
      displayNumber(getAccountScopeTrades(state.trades).length) +
      " پوزیشن ثبت‌شده · فهرست معاملات و همهٔ تحلیل‌ها برای " +
      (scope ? "این حساب" : "مجموع حساب‌ها") +
      " · ارز پیش‌فرض حساب‌های جدید: " +
      state.settings.currency;
    $("#account-editor-currency-label").textContent =
      "(" +
      (getAccountById(accountEditorId)?.currency || state.settings.currency) +
      ")";
    replaceAccountChoices(
      $("#account-editor-select"),
      state.accounts,
      state.accounts.some((account) => account.id === accountEditorId)
        ? accountEditorId
        : "",
      "ساخت حساب جدید",
    );
  };
  const accountOverviewValue = (value) => {
    const cell = makeElement("td");
    cell.appendChild(makeElement("bdi", "account-overview-number", value));
    return cell;
  };
  const renderAccountOverview = () => {
    const filtered = getFilteredTrades({
      ignoreAccount: true,
    });
    const body = $("#account-overview-rows");
    body.replaceChildren();
    const rows = [
      {
        id: "",
        name: "همهٔ حساب‌ها",
        description: "مجموع معاملات همهٔ حساب‌ها",
        archived: false,
        accountBalance: state.accounts.reduce(
          (sum, account) => sum + account.accountBalance,
          0,
        ),
      },
      ...state.accounts,
    ];
    rows.forEach((account) => {
      const trades = account.id
        ? filtered.filter((trade) => trade.accountId === account.id)
        : filtered;
      const performance = summarizePerformance(closedResults(trades));
      const closed = trades.filter((trade) => trade.status === "closed").length;
      const open = trades.filter((trade) => trade.status === "open").length;
      const planned = trades.filter(
        (trade) => trade.status === "planned",
      ).length;
      const row = makeElement(
        "tr",
        (account.id ? "" : "is-total ") +
          (account.id === activeAccountScope ? "is-selected" : ""),
      );
      row.dataset.accountId = account.id;
      row.dataset.summary = JSON.stringify({
        trades: trades.length,
        closed,
        open,
        planned,
        ...performance,
      });
      const nameCell = makeElement("td");
      const nameButton = makeElement(
        "button",
        "account-overview-link",
        accountChoiceLabel(account),
      );
      nameButton.type = "button";
      nameButton.setAttribute(
        "aria-label",
        "نمایش اطلاعات " + accountChoiceLabel(account),
      );
      if (account.id === activeAccountScope)
        nameButton.setAttribute("aria-current", "true");
      nameButton.addEventListener("click", async () => {
        setAccountScope(account.id);
        await navigateJournalRoute("#trades");
      });
      nameCell.appendChild(nameButton);
      if (account.description)
        nameCell.appendChild(
          makeElement(
            "small",
            "account-overview-secondary",
            account.description,
          ),
        );
      const countCell = makeElement("td", "", displayNumber(trades.length));
      countCell.appendChild(
        makeElement(
          "small",
          "account-overview-secondary",
          displayNumber(closed) +
            " بسته · " +
            displayNumber(open) +
            " باز · " +
            displayNumber(planned) +
            " پیش‌نویس",
        ),
      );
      const winCell = makeElement(
        "td",
        "",
        performance.winRate === null
          ? "—"
          : displayNumber(performance.winRate, 1) + "٪",
      );
      winCell.appendChild(
        makeElement(
          "small",
          "account-overview-secondary",
          displayNumber(performance.wins) +
            " برد · " +
            displayNumber(performance.losses) +
            " باخت · " +
            displayNumber(performance.breakevens) +
            " سربه‌سر",
        ),
      );
      row.append(
        nameCell,
        countCell,
        winCell,
        accountOverviewValue(displayRR(performance.avgPlannedRR)),
        accountOverviewValue(displayR(performance.avgR)),
        accountOverviewValue(displayMoney(performance.net, account.currency)),
        accountOverviewValue(
          displayMoney(account.accountBalance, account.currency),
        ),
      );
      body.appendChild(row);
    });
    $("#account-overview-count").textContent =
      displayNumber(state.accounts.length) +
      " حساب · " +
      displayNumber(filtered.length) +
      " معامله در سایر فیلترها";
  };
  const showAccountEditorError = (message) => {
    const error = $("#account-editor-error");
    error.textContent = message;
    error.hidden = !message;
  };
  const toggleAccountEditorRisk = () => {
    const fixed = $("#account-editor-risk-mode").value === "fixed";
    $("#account-editor-percent-field").hidden = fixed;
    $("#account-editor-fixed-field").hidden = !fixed;
  };
  const fillAccountEditor = (id) => {
    const account = getAccountById(id);
    $("#account-editor-currency").value =
      account?.currency || state.settings.currency;
    $("#account-editor-currency").disabled = state.trades.some(
      (trade) => trade.accountId === id,
    );
    accountEditorId = account?.id || "";
    $("#account-editor-select").value = accountEditorId;
    $("#account-editor-name").value = account?.name || "";
    $("#account-editor-description").value = account?.description || "";
    setNumericInputValue(
      $("#account-editor-balance"),
      account?.accountBalance ?? state.settings.accountBalance,
    );
    setNumericInputValue(
      $("#account-editor-risk-percent"),
      account?.riskPercent ?? state.settings.riskPercent,
    );
    setNumericInputValue(
      $("#account-editor-fixed-risk"),
      account?.fixedRisk ?? state.settings.fixedRisk,
    );
    $("#account-editor-risk-mode").value =
      account?.riskMode || state.settings.riskMode;
    $("#account-editor-save").textContent = account
      ? "ذخیرهٔ تغییرات حساب"
      : "افزودن حساب";
    const archive = $("#account-editor-archive");
    archive.hidden = !account;
    archive.textContent = account?.archived
      ? "بازگرداندن حساب"
      : "بایگانی حساب";
    archive.disabled = Boolean(
      account &&
      !account.archived &&
      state.accounts.filter((item) => !item.archived).length <= 1,
    );
    archive.title = archive.disabled ? "دست‌کم یک حساب باید فعال بماند." : "";
    $("#account-editor-status").textContent = account
      ? displayNumber(
          state.trades.filter((trade) => trade.accountId === account.id).length,
        ) +
        " پوزیشن در این حساب. " +
        (account.archived
          ? "این حساب بایگانی شده؛ سابقهٔ آن همچنان در گزارش‌ها هست."
          : archive.disabled
            ? "این آخرین حساب فعال است و بایگانی نمی‌شود."
            : "بایگانی حساب سابقهٔ پوزیشن‌ها را حفظ می‌کند.")
      : "حساب جدید با سابقهٔ خالی ساخته می‌شود. تنظیمات ریسک آن مستقل است.";
    showAccountEditorError("");
    toggleAccountEditorRisk();
  };
  const afterAccountMutation = (id) => {
    accountEditorId = id;
    refreshAccountUI();
    syncSettingsUI();
    updateCalculator();
    renderAll();
    fillAccountEditor(id);
  };
  const initializeAccounts = () => {
    try {
      const stored = localStorage.getItem(accountScopeKey) || "";
      activeAccountScope = state.accounts.some(
        (account) => account.id === stored,
      )
        ? stored
        : "";
    } catch {}
    refreshAccountUI();
    $("#account-scope").addEventListener("change", (event) =>
      setAccountScope(event.target.value),
    );
    $("#trade-account").addEventListener("change", () => refreshAccountUI());
    $("#manage-accounts")?.addEventListener("click", async () => {
      refreshAccountUI();
      fillAccountEditor(
        activeAccountScope ||
          $("#trade-account").value ||
          state.accounts[0]?.id ||
          "",
      );
      await navigateJournalRoute("#accounts");
      $("#account-editor-name").focus({
        preventScroll: true,
      });
    });
    $("#close-account-manager")?.addEventListener("click", () =>
      fillAccountEditor(""),
    );
    $("#account-editor-select").addEventListener("change", (event) =>
      fillAccountEditor(event.target.value),
    );
    $("#account-new").addEventListener("click", () => {
      fillAccountEditor("");
      $("#account-editor-name").focus();
    });
    $("#account-editor-risk-mode").addEventListener(
      "change",
      toggleAccountEditorRisk,
    );
    $("#account-editor-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = $("#account-editor-name").value.trim().slice(0, 80);
      const description = $("#account-editor-description")
        .value.trim()
        .slice(0, 1000);
      const accountBalance = services.numeric(
        $("#account-editor-balance").value,
      );
      const riskMode =
        $("#account-editor-risk-mode").value === "fixed" ? "fixed" : "percent";
      const riskPercent = positiveNumber(
        $("#account-editor-risk-percent").value,
      );
      const fixedRisk = services.numeric($("#account-editor-fixed-risk").value);
      if (!name) {
        showAccountEditorError("نام حساب را وارد کن.");
        $("#account-editor-name").focus();
        return;
      }
      if (
        state.accounts.some(
          (account) =>
            account.id !== accountEditorId &&
            account.name.trim().toLocaleLowerCase() ===
              name.toLocaleLowerCase(),
        )
      ) {
        showAccountEditorError(
          "این نام برای حساب دیگری ثبت شده؛ نام متفاوتی انتخاب کن.",
        );
        return;
      }
      if (accountBalance === null) {
        showAccountEditorError("ماندهٔ حساب باید عددی بزرگ‌تر از صفر باشد.");
        $("#account-editor-balance").focus();
        return;
      }
      if (
        riskMode === "percent" &&
        (riskPercent === null || riskPercent > 100)
      ) {
        showAccountEditorError(
          "درصد ریسک باید بزرگ‌تر از صفر و حداکثر ۱۰۰ باشد.",
        );
        $("#account-editor-risk-percent").focus();
        return;
      }
      if (riskMode === "fixed" && fixedRisk === null) {
        showAccountEditorError("مبلغ ثابت ریسک باید بزرگ‌تر از صفر باشد.");
        $("#account-editor-fixed-risk").focus();
        return;
      }
      const existing = getAccountById(accountEditorId);
      const id = existing?.id || "account-" + makeId();
      const nextAccount = {
        ...existing,
        id,
        name,
        description,
        currency:
          $("#account-editor-currency")
            .value.toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 8) || state.settings.currency,
        accountBalance,
        riskMode,
        riskPercent:
          riskPercent !== null && riskPercent <= 100
            ? riskPercent
            : existing?.riskPercent || state.settings.riskPercent,
        fixedRisk: fixedRisk ?? existing?.fixedRisk ?? state.settings.fixedRisk,
        archived: Boolean(existing?.archived),
      };
      const accounts = existing
        ? state.accounts.map((account) =>
            account.id === id ? nextAccount : account,
          )
        : [...state.accounts, nextAccount];
      const settings =
        id === DEFAULT_ACCOUNT_ID
          ? {
              ...state.settings,
              accountBalance: nextAccount.accountBalance,
              riskMode: nextAccount.riskMode,
              riskPercent: nextAccount.riskPercent,
              fixedRisk: nextAccount.fixedRisk,
            }
          : state.settings;
      if (
        !(await persist({
          ...state,
          accounts,
          settings,
        }))
      ) {
        showAccountEditorError(
          "حساب ذخیره نشد. پیام ذخیره‌سازی ژورنال را بررسی کن.",
        );
        return;
      }
      afterAccountMutation(id);
      showToast(existing ? "تغییرات حساب ذخیره شد." : "حساب جدید اضافه شد.");
    });
    $("#account-editor-archive").addEventListener("click", async () => {
      const account = getAccountById(accountEditorId);
      if (!account) return;
      if (
        !account.archived &&
        state.accounts.filter((item) => !item.archived).length <= 1
      ) {
        showAccountEditorError("دست‌کم یک حساب باید فعال بماند.");
        return;
      }
      const archived = !account.archived;
      if (
        !(await persist({
          ...state,
          accounts: state.accounts.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  archived,
                }
              : item,
          ),
        }))
      ) {
        showAccountEditorError(
          "وضعیت حساب ذخیره نشد. پیام ذخیره‌سازی ژورنال را بررسی کن.",
        );
        return;
      }
      afterAccountMutation(account.id);
      showToast(
        archived
          ? "حساب بایگانی شد؛ سابقهٔ معاملات محفوظ است."
          : "حساب دوباره فعال شد.",
      );
    });
    fillAccountEditor("");
  };

  // Page views retain their DOM, editor draft and report controls while navigating.
  const tradeDetailHref = (id) => "#trade=" + encodeURIComponent(id);
  const tradeIdFromHash = (hash) => {
    if (!hash.startsWith("#trade=")) return null;
    try {
      return decodeURIComponent(hash.slice(7)) || null;
    } catch {
      return null;
    }
  };
  let applyPageRoute = null;
  let activeTradeDetailId = null;
  let editorBaseline = null;
  let loadedEditorRoute = null;
  let editorOriginHash = "#trades";
  let acceptedRouteHash = "#dashboard";
  let currentView = "dashboard";
  let lastFilterFingerprint = null;
  let tradeListScroll = 0;
  let bypassUnloadOnce = false;
  const filterPanelState = new Map();
  const editorFingerprint = () => {
    const values = formValues();
    delete values.id;
    return JSON.stringify(values);
  };
  const markEditorClean = () => {
    editorBaseline = editorFingerprint();
  };
  const editorIsDirty = () =>
    imageProcessingCount > 0 ||
    (editorBaseline !== null && editorFingerprint() !== editorBaseline);
  const confirmDraftReplacement = async () =>
    !editorIsDirty() ||
    (await services.confirm(
      "تغییرات ذخیره‌نشدهٔ معامله کنار گذاشته شود؟ برای ادامهٔ ویرایش، انصراف را انتخاب کن.",
    ));
  const revealPopulatedEditorSections = (trade) => {
    const sections = [
      [
        "accordion-plan-panel",
        optionTradeValues(trade, "strategy").length ||
          trade.entryReason ||
          trade.setupQuality ||
          trade.fees > 0,
      ],
      ["accordion-confirmations-panel", trade.confirmations?.length],
      [
        "accordion-timeframe-directions-panel",
        Object.values(trade.timeframeDirections || {}).some(
          (value) => value !== "unknown",
        ),
      ],
      [
        "accordion-psychology-panel",
        optionTradeValues(trade, "emotion").some(
          (value) => value !== "unknown",
        ) ||
          optionTradeValues(trade, "mistakeType").some(
            (value) => value !== "none",
          ) ||
          trade.confidence ||
          trade.planFollowed !== "unknown",
      ],
      [
        "accordion-excursion-panel",
        (trade.maxUnrealizedProfit !== null &&
          trade.maxUnrealizedProfit !== undefined) ||
          (trade.maxUnrealizedLoss !== null &&
            trade.maxUnrealizedLoss !== undefined),
      ],
      ["accordion-partial-exits-panel", trade.partialExits?.length],
      [
        "accordion-notes-panel",
        trade.notes || trade.screenshotRef || trade.images?.length,
      ],
    ];
    sections.forEach(([id, populated]) => {
      const panel = document.getElementById(id);
      if (panel && populated)
        setAccordion(panel.closest("[data-accordion]"), true);
    });
  };
  const resolvePageRoute = (originalHash) => {
    const aliases = {
      "#journal-page": "#dashboard",
      "#journal": "#trades",
      "#position-trades": "#trades",
      "#form-card": "#trade-new",
      "#account-workspace": "#accounts",
      "#account-overview": "#accounts",
      "#analysis": "#analytics",
      "#rr-winrate-table": "#analytics/table",
      "#rr-winrate": "#scenarios",
      "#rr-winrate-matrix": "#scenarios",
    };
    const hash = aliases[originalHash] || originalHash || "#dashboard";
    if (hash.startsWith("#trade="))
      return {
        view: "trade",
        hash,
        id: tradeIdFromHash(hash),
        title: "جزئیات پوزیشن",
      };
    const editorMatch = hash.match(/^#trade-(edit|close)=(.*)$/);
    if (editorMatch) {
      let id = null;
      try {
        id = decodeURIComponent(editorMatch[2]) || null;
      } catch {}
      return {
        view: "editor",
        hash,
        id,
        action: editorMatch[1],
        title: editorMatch[1] === "close" ? "بستن معامله" : "ویرایش معامله",
      };
    }
    if (hash === "#trade-new")
      return {
        view: "editor",
        hash,
        title: editingId ? "ادامهٔ ویرایش معامله" : "معاملهٔ جدید",
      };
    const analytics = hash.match(/^#analytics(?:\/([^/]+))?$/);
    if (analytics) {
      const tab = [
        "summary",
        "factors",
        "time",
        "behavior",
        "reached-r",
        "table",
      ].includes(analytics[1])
        ? analytics[1]
        : "summary";
      return {
        view: "analytics",
        hash: tab === "summary" ? "#analytics" : "#analytics/" + tab,
        tab,
        title: "تحلیل عملکرد",
      };
    }
    const catalogs = hash.match(/^#catalogs(?:\/([^/]+))?$/);
    if (catalogs)
      return {
        view: "catalogs",
        hash: OPTION_GROUPS[catalogs[1]] ? hash : "#catalogs",
        group: OPTION_GROUPS[catalogs[1]] ? catalogs[1] : "confirmations",
        title: "ستاپ‌ها و فاکتورها",
      };
    if (
      hash === "#settings" ||
      hash === "#settings/general" ||
      hash === "#settings/data"
    )
      return {
        view: "settings",
        hash: hash === "#settings/general" ? "#settings" : hash,
        tab: hash.endsWith("/data") ? "data" : "general",
        title: "تنظیمات",
      };
    const views = {
      "#dashboard": ["dashboard", "نمای کلی"],
      "#trades": ["trades", "معاملات"],
      "#charts": ["charts", "نمودارهای نرخ برد"],
      "#scenarios": ["scenarios", "شبیه‌ساز R/R"],
      "#accounts": ["accounts", "حساب‌ها"],
    };
    const [view, title] = views[hash] || views["#dashboard"];
    return {
      view,
      title,
      hash: views[hash] ? hash : "#dashboard",
    };
  };
  const navigateJournalRoute = async (hash) => {
    const route = resolvePageRoute(hash);
    if (
      route.view === "editor" &&
      route.action &&
      route.hash !== loadedEditorRoute &&
      !(await confirmDraftReplacement())
    )
      return false;
    if (location.hash !== route.hash) history.pushState(null, "", route.hash);
    return applyPageRoute?.(true, true) !== false;
  };
  const openTradeEditor = async (trade, closeMode = false) => {
    if (!state.trades.some((item) => item.id === trade.id)) {
      await navigateJournalRoute(tradeDetailHref(trade.id));
      return;
    }
    const previousOrigin = editorOriginHash;
    if (currentView !== "editor") editorOriginHash = acceptedRouteHash;
    if (
      !(await navigateJournalRoute(
        "#trade-" +
          (closeMode ? "close" : "edit") +
          "=" +
          encodeURIComponent(trade.id),
      ))
    )
      editorOriginHash = previousOrigin;
  };
  const editTradeFromDetail = async (trade, closeMode = false) =>
    await openTradeEditor(trade, closeMode);
  const filterFingerprint = () =>
    JSON.stringify([
      activeAccountScope,
      refs.filterSymbol.value,
      exactFactorSymbol,
      refs.filterDirection.value,
      refs.filterStatus.value,
      refs.filterSession.value,
      refs.filterFrom.value,
      refs.filterTo.value,
      refs.filterConfirmationMode.value,
      [...selectedFactorConfirmations].sort(),
      $("#filter-touched-r-min").value,
      $$("select[data-factor]").map((select) => [select.id, select.value]),
    ]);
  const syncTradePaginationWithFilters = () => {
    const signature = filterFingerprint();
    if (lastFilterFingerprint !== signature) {
      resetTradePagination();
      lastFilterFingerprint = signature;
      tradeListScroll = 0;
    }
  };
  const renderFilterChips = () => {
    const root = $("#filter-chips");
    root.replaceChildren();
    const add = (text, clear) => {
      const button = makeElement("button", "filter-chip", text);
      window.EdgeIcons?.decorate(button, "close", false);
      button.type = "button";
      button.setAttribute("aria-label", "حذف فیلتر " + text);
      button.addEventListener("click", () => {
        clear();
        syncAllListboxes();
        renderAll();
      });
      root.appendChild(button);
    };
    const basic = [
      [refs.filterSymbol, "جست‌وجو", ""],
      [refs.filterDirection, "جهت", "all"],
      [refs.filterStatus, "وضعیت", "all"],
      [refs.filterSession, "سشن", "all"],
      [refs.filterFrom, "از تاریخ", ""],
      [refs.filterTo, "تا تاریخ", ""],
    ];
    basic.forEach(([input, title, empty]) => {
      if (input.value === empty) return;
      const value =
        input.tagName === "SELECT"
          ? input.selectedOptions[0]?.textContent || input.value
          : input.value;
      add(title + ": " + value, () => {
        if (input.matches("[data-persian-date]"))
          setPersianDateInput(input, "");
        else input.value = empty;
        if (input === refs.filterSymbol) exactFactorSymbol = null;
      });
    });
    $$("select[data-factor]").forEach((select) => {
      if (!select.value) return;
      const title =
        $('label[for="' + select.id + '"]')?.textContent || "فاکتور";
      add(
        title + ": " + (select.selectedOptions[0]?.textContent || select.value),
        () => {
          select.value = "";
        },
      );
    });
    [...selectedFactorConfirmations].forEach((value) =>
      add("تأییدیه: " + labelFor("confirmations", value), () =>
        selectedFactorConfirmations.delete(value),
      ),
    );
    if (refs.filterConfirmationMode.value !== "all")
      add(
        "ترکیب: " + refs.filterConfirmationMode.selectedOptions[0].textContent,
        () => {
          refs.filterConfirmationMode.value = "all";
        },
      );
    const reached = $("#filter-touched-r-min");
    if (reached.value !== "")
      add(reached.selectedOptions[0].textContent, () => {
        reached.value = "";
      });
    $("#clear-report-filters").hidden = root.children.length === 0;
    const population = getFilteredTrades({
      ignoreAccount: currentView === "accounts",
    });
    const scope =
      currentView === "accounts"
        ? "مقایسهٔ همهٔ حساب‌ها"
        : accountName(activeAccountScope) && activeAccountScope
          ? accountName(activeAccountScope)
          : "همهٔ حساب‌ها";
    $("#report-population").textContent =
      scope +
      " · " +
      displayNumber(population.length) +
      " معامله" +
      (root.children.length
        ? " · " + displayNumber(root.children.length) + " فیلتر فعال"
        : "");
  };
  const setReportFiltersOpen = (open) => {
    filterPanelState.set(currentView, open);
    if (!globalThis.EdgeUI?.setDisclosure?.($("#report-filter-shell"), open)) {
      $("#report-filter-content").hidden = !open;
      $("#toggle-report-filters").setAttribute("aria-expanded", String(open));
      $("#toggle-report-filters").textContent = open
        ? "بستن فیلترها"
        : "نمایش فیلترها";
    }
  };
  const revealReportFilters = () => {
    setReportFiltersOpen(true);
    $("#advanced-trade-filters").open = true;
  };
  const initializePageNavigation = async () => {
    const pages = new Map(
      $$(".app-page[data-app-page]").map((page) => [
        page.dataset.appPage,
        page,
      ]),
    );
    const sidebar = $("#app-sidebar"),
      toggle = $("#sidebar-toggle"),
      backdrop = $("#sidebar-backdrop");
    const desktop = matchMedia("(min-width: 1024px)");
    let sidebarOpen = false;
    const setSidebarOpen = (open, restoreFocus = true) => {
      sidebarOpen = Boolean(open && !desktop.matches);
      document.body.classList.toggle("sidebar-open", sidebarOpen);
      backdrop.hidden = !sidebarOpen;
      toggle.setAttribute("aria-expanded", String(sidebarOpen));
      sidebar.inert = !desktop.matches && !sidebarOpen;
      $("#main").inert = sidebarOpen;
      if (sidebarOpen) {
        sidebar.setAttribute("role", "dialog");
        sidebar.setAttribute("aria-modal", "true");
        requestAnimationFrame(() => {
          if (sidebarOpen) sidebar.querySelector("a").focus();
        });
      } else {
        sidebar.removeAttribute("role");
        sidebar.removeAttribute("aria-modal");
        if (restoreFocus && !desktop.matches) toggle.focus();
      }
    };
    toggle.addEventListener("click", () => setSidebarOpen(!sidebarOpen));
    backdrop.addEventListener("click", () => setSidebarOpen(false));
    desktop.addEventListener("change", () => setSidebarOpen(false, false));
    setSidebarOpen(false, false);
    document.addEventListener("keydown", (event) => {
      if (!sidebarOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebarOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const links = Array.from(
        sidebar.querySelectorAll("a[href],button:not([disabled])"),
      );
      const first = links[0],
        last = links.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    const applyRoute = async (force = false, guardChecked = false) => {
      const route = resolvePageRoute(location.hash);
      if (!force && route.hash === acceptedRouteHash) return true;
      if (
        route.view === "editor" &&
        route.action &&
        route.hash !== loadedEditorRoute &&
        !guardChecked &&
        !(await confirmDraftReplacement())
      ) {
        history.replaceState(null, "", acceptedRouteHash);
        return false;
      }
      const previousView = currentView;
      if (previousView === "trades") tradeListScroll = window.scrollY;
      if (location.hash !== route.hash)
        history.replaceState(null, "", route.hash);
      globalThis.EdgeUI?.closeAll?.();
      if (openListboxController) closeListbox(openListboxController, false);
      if (openDateController) closePersianCalendar(openDateController, false);
      multiPickerControllers.forEach((controller) => {
        controller.root.open = false;
      });
      if ($("#trade-image-viewer").open) $("#trade-image-viewer").close();
      setSidebarOpen(false, false);
      currentView = route.view;
      let actualView = route.view;
      if (
        route.view === "editor" &&
        route.action &&
        route.hash !== loadedEditorRoute
      ) {
        const trade = state.trades.find((item) => item.id === route.id);
        if (trade) {
          pages.forEach((page, key) => {
            page.hidden = key !== "editor";
          });
          fillForm(trade, route.action === "close");
          loadedEditorRoute = route.hash;
        } else {
          actualView = "trade";
          activeTradeDetailId = route.id;
          renderTradeDetail(route.id);
        }
      }
      pages.forEach((page, key) => {
        page.hidden = key !== actualView;
      });
      if (route.view === "trade") {
        activeTradeDetailId = route.id;
        renderTradeDetail(route.id);
      }
      const reportHosts = {
        dashboard: "#dashboard-filter-slot",
        trades: "#journal-filter-slot",
        analytics: "#analysis-filter-slot",
        charts: "#charts-filter-slot",
        accounts: "#accounts-filter-slot",
      };
      const filters = $("#report-filter-shell");
      filters.hidden = !reportHosts[actualView];
      if (reportHosts[actualView]) {
        $(reportHosts[actualView]).appendChild(filters);
        setReportFiltersOpen(
          filterPanelState.has(actualView)
            ? filterPanelState.get(actualView)
            : actualView === "trades" || actualView === "analytics",
        );
      }
      $("#shell-account-scope").hidden = ![
        "dashboard",
        "trades",
        "analytics",
        "charts",
      ].includes(actualView);
      $("#shell-position-account").hidden = actualView !== "editor";
      $("#shell-page-title").textContent = route.title;
      $("#shell-environment").textContent = IS_DEMO
        ? "محیط آزمایشی"
        : "ژورنال اصلی";
      $("#shell-environment").classList.toggle("is-demo", IS_DEMO);
      if (actualView === "editor") {
        const title = editingId ? refs.formTitle.textContent : "معاملهٔ جدید";
        $("#editor-page h1").textContent = title;
        $("#shell-page-title").textContent = title;
        $("#editor-back").href = editorOriginHash;
      }
      $$("[data-analytics-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.analyticsPanel !== route.tab;
      });
      $$("[data-analytics-tab]").forEach((link) => {
        if (link.dataset.analyticsTab === route.tab)
          link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      if (actualView === "settings") {
        $("#settings-general").hidden = route.tab !== "general";
        $("#settings-data").hidden = route.tab !== "data";
        $$("[data-settings-tab]").forEach((link) => {
          if (link.dataset.settingsTab === route.tab)
            link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      }
      if (actualView === "catalogs") renderCatalogRoute(route.group);
      if (actualView === "charts") renderWinRateCharts(getFilteredTrades());
      $$("[data-page-link]").forEach((link) => {
        if (
          link.dataset.pageLink ===
          (actualView === "trade"
            ? "trades"
            : actualView === "catalogs"
              ? "settings"
              : actualView)
        )
          link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      document.title = $("#shell-page-title").textContent + " — ژورنال اِج";
      acceptedRouteHash = route.hash;
      [
        [$("#toggle-demo-top"), !IS_DEMO],
        [$("#exit-demo"), false],
      ].forEach(([link, demo]) => {
        const url = new URL(location.href);
        url.searchParams.set("demo", demo ? "1" : "0");
        link.href = url.href;
      });
      renderAll();
      const page = pages.get(actualView);
      const heading = page?.querySelector("h1") || page;
      heading?.setAttribute("tabindex", "-1");
      heading?.focus({
        preventScroll: true,
      });
      requestAnimationFrame(() => {
        if (currentView !== route.view) return;
        window.scrollTo({
          top:
            actualView === "trades" && previousView === "trade"
              ? tradeListScroll
              : 0,
          behavior: "instant",
        });
      });
      return true;
    };
    applyPageRoute = applyRoute;
    document.addEventListener("click", async (event) => {
      const link = event.target.closest?.("a[href]");
      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        link.hasAttribute("download") ||
        (link.target && link.target !== "_self")
      )
        return;
      const href = link.getAttribute("href");
      if (href.startsWith("#")) {
        event.preventDefault();
        if (href === "#main") {
          const page = pages.get(currentView);
          const heading = page?.querySelector("h1") || page;
          heading?.focus({
            preventScroll: true,
          });
          window.scrollTo({
            top: 0,
            behavior: "instant",
          });
          return;
        }
        if (link.dataset.statusShortcut) {
          refs.filterStatus.value = link.dataset.statusShortcut;
          syncAllListboxes();
          renderAll();
        }
        await navigateJournalRoute(href);
      } else if (editorIsDirty()) {
        event.preventDefault();
        if (!(await confirmDraftReplacement())) return;
        bypassUnloadOnce = true;
        location.assign(link.href);
      }
    });
    window.addEventListener("hashchange", async () => await applyRoute());
    window.addEventListener("popstate", async () => await applyRoute());
    window.addEventListener("beforeunload", (event) => {
      if (bypassUnloadOnce) {
        bypassUnloadOnce = false;
        return;
      }
      if (editorIsDirty()) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    // Report-filter Disclosure owns its click and keyboard handling.
    $("#clear-report-filters").addEventListener("click", resetFilters);
    await applyRoute(true);
  };
  const initializeDemoControls = () => {
    const modeURL = (demo) => {
      const url = new URL(location.href);
      url.searchParams.set("demo", demo ? "1" : "0");
      return url.href;
    };
    const toggle = $("#toggle-demo-top");
    toggle.href = modeURL(!IS_DEMO);
    toggle.textContent = IS_DEMO ? "ژورنال اصلی" : "آزمایش ۱۰۰ پوزیشن";
    $("#exit-demo").href = modeURL(false);
    $("#demo-banner").hidden = !IS_DEMO;
    $("#option-manager-title").textContent = IS_DEMO
      ? "گزینه‌های محیط آزمایشی"
      : "گزینه‌های ژورنال اصلی";
    $("#reset-demo").addEventListener("click", async () => {
      if (
        !IS_DEMO ||
        !(await services.confirm(
          "تغییرات محیط آزمایشی پاک و ۱۰۰ پوزیشن پایه دوباره بارگذاری شود؟ ژورنال اصلی تغییر نمی‌کند.",
        ))
      )
        return;
      if (await persist(createDemoState())) location.reload();
    });
    $("#export-demo-fixture").addEventListener("click", () => {
      download(
        "edge-journal-test-100-positions.json",
        JSON.stringify(
          {
            ...createDemoState(),
            dataMode: "demo",
            exportedAt: nowIso(),
          },
          null,
          2,
        ),
        "application/json",
      );
      showToast("۱۰۰ پوزیشن ساختگی پایه دانلود شد.");
    });
  };
  const initialize = async () => {
    initializeImageViewer();
    initializeDemoControls();
    initializeLocalizedInputs();
    initializePersianDatePickers();
    initializeOptionManager();
    initializeListboxes();
    initializeAccordions();
    initializeAccounts();
    $("#trade-account").addEventListener("change", () => {
      services.setFormCurrency(
        getFormAccount()?.currency || state.settings.currency,
      );
      syncSettingsUI();
      updateCalculator();
    });
    syncSettingsUI();
    syncProjectionDefaults();
    setPersianDateInput(refs.openDate, today());
    setTimeInputValue(refs.openTime, currentTime());
    renderConfirmationOptions([]);
    $("#csv-columns").textContent = CSV_COLUMNS.join(", ");
    toggleCloseFields();
    initializeTradeImageEditor();
    initializePartialExitEditor();
    bindEvents();
    updateCalculator();
    renderAll();
    renderProjection();
    initializeGeneralSettings();
    initializeTradePagination();
    markEditorClean();
    await initializePageNavigation();
    globalThis.EdgeUI.applyIcons();
    if (startupWarning)
      setTimeout(
        () => showToast(startupWarning, !startupWarning.includes("موفقیت")),
        100,
      );
  };

  // A small, read-only test surface makes the financial math easy to verify.
  Object.defineProperty(globalThis, "EdgeJournal", {
    value: Object.freeze({
      calculatePlan,
      calculatePartialExits,
      calculateClosed,
      calculateMaxTouchedR,
      maxTouchedRBucket,
      hasTouchedR,
      factorValues,
      factorLabel,
      matchesFactorValue,
      normalizeTrade,
      normalizeConfirmationType,
      normalizeContextDirection,
      normalizeTimeframeDirections,
      normalizeConfirmationValues,
      normalizeAccountId,
      defaultAccount,
      sanitizeAccounts,
      getAccountById,
      resolveCSVAccount,
      normalizeTradeImages,
      validateTradeImageAsset,
      prepareImportedImageAssets,
      exportImageAssets,
      mergeCatalogRecovery,
      optionTradeValues,
      normalizeOptionValues,
      sanitizeOptions,
      csvTradeValue,
      parseExcursion,
      calculateProjectionScenario,
      summarizePerformance,
      buildWinRateChartData,
      summarizeTouchedRReach,
      matchesConfirmationFilter,
      parseCSV,
      parseLocalizedNumber,
      gregorianToJalali,
      jalaliToGregorian,
      parsePersianDate,
      formatPersianDateInput,
      canonicalTime,
      classifyWeekpart,
      getSnapshot: () =>
        services.repository.exportSnapshot(IS_DEMO ? "demo" : "live"),
      getStatus: () => structuredClone(services.state),
      version: VERSION,
    }),
    writable: false,
    configurable: false,
  });
  await initialize();
  document.documentElement.dataset.journalReady = "true";
  refs.form.addEventListener("input", () => services.autosave(formValues()));
  refs.form.addEventListener("change", () => services.autosave(formValues()));
  globalThis.addEventListener("edge-domain-change", () => {
    updateCalculator();
    services.autosave(formValues());
  });
  await services.restoreDraft(async (payload) => {
    fillForm(payload);
    await navigateJournalRoute("#trade-new");
  });
})();

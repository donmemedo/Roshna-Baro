"""Static, editorially reviewed content plus first-run database seeds."""

_SIZES = [
    ("دانه خشخاش", "poppy seed"), ("دانه کنجد", "sesame seed"), ("عدس", "lentil"), ("دانه بلوبری", "blueberry"),
    ("لوبیا", "kidney bean"), ("زیتون", "olive"), ("آلو", "plum"), ("لیمو شیرین", "lime"),
    ("آلوی بزرگ", "large plum"), ("هلو", "peach"), ("لیمو ترش", "lemon"), ("آووکادو", "avocado"),
    ("انار", "pomegranate"), ("گلابی", "pear"), ("فلفل دلمه‌ای", "bell pepper"), ("انبه", "mango"),
    ("موز", "banana"), ("هویج بزرگ", "large carrot"), ("انبه بزرگ", "large mango"), ("ذرت", "corn cob"),
    ("بادمجان", "eggplant"), ("نارگیل", "coconut"), ("کدو سبز", "zucchini"), ("طالبی کوچک", "small melon"),
    ("گل‌کلم", "cauliflower"), ("کاهو", "lettuce head"), ("کلم بروکلی", "broccoli"), ("خیار بزرگ", "large cucumber"),
    ("آناناس", "pineapple"), ("طالبی", "cantaloupe"), ("نارگیل بزرگ", "large coconut"), ("کلم پیچ", "cabbage"),
    ("آناناس بزرگ", "large pineapple"), ("طالبی بزرگ", "honeydew"), ("خربزه", "melon"), ("کاهوی رومی", "romaine"),
    ("چغندر بزرگ", "large beet"), ("تره‌فرنگی", "leek"), ("هندوانه کوچک", "small watermelon"),
    ("کدو حلوایی کوچک", "small pumpkin"), ("هندوانه", "watermelon"), ("کدو حلوایی", "pumpkin"),
]

_FOCUS_FA = [
    "شروع شمارش بارداری از اولین روز آخرین پریود است.", "لانه‌گزینی در جدار رحم انجام می‌شود.",
    "ضربان قلب جنین شکل می‌گیرد.", "تهوع صبحگاهی ممکن است شروع شود.", "اولین سونوگرافی را برنامه‌ریزی کنید.",
    "دست‌ها و پاها در حال شکل‌گیری‌اند.", "آزمایش‌های سه‌ماهه اول را انجام دهید.", "خستگی طبیعی است؛ استراحت کنید.",
    "غربالگری سه‌ماهه اول در این بازه انجام می‌شود.", "خطر سقط به‌طور چشمگیری کاهش می‌یابد.",
    "ممکن است انرژی‌تان برگردد.", "جنسیت جنین در سونوگرافی قابل تشخیص می‌شود.",
    "اولین حرکات جنین را ممکن است حس کنید.", "آزمایش آنومالی را فراموش نکنید.", "کم‌خونی را بررسی کنید.",
    "درد رباط گرد شایع است.", "آهن و کلسیم را جدی بگیرید.", "خواب به پهلوی چپ بهتر است.",
    "تست قند بارداری نزدیک است.", "شمارش حرکات جنین را شروع کنید.", "کلاس آمادگی زایمان را رزرو کنید.",
    "تورم پا شایع است؛ پاها را بالا بگذارید.", "علائم زایمان زودرس را بشناسید.", "ساک زایمان را آماده کنید.",
    "انقباضات تمرینی طبیعی است.", "وضعیت قرارگیری جنین بررسی می‌شود.", "برنامه زایمان را با پزشک مرور کنید.",
    "هفته‌های پایانی؛ استراحت و آرامش.", "علائم شروع زایمان را مرور کنید.",
]

PREGNANCY_WEEKS = []
for i in range(42):
    size_fa, size_en = _SIZES[i]
    focus_fa = _FOCUS_FA[i % len(_FOCUS_FA)]
    trimester = 1 if i < 13 else (2 if i < 27 else 3)
    PREGNANCY_WEEKS.append({
        "size_fa": size_fa,
        "size_en": size_en,
        "trimester": trimester,
        "title_fa": f"هفته {i + 1} بارداری",
        "title_en": f"Week {i + 1} of pregnancy",
        "focus_fa": focus_fa,
        "focus_en": [
            "Pregnancy is counted from the first day of your last period.", "Implantation happens in the uterine lining.",
            "The fetal heartbeat is forming.", "Morning sickness may begin.", "Plan your first ultrasound.",
            "Hands and feet are forming.", "Take your first-trimester blood tests.", "Fatigue is normal — rest.",
            "First-trimester screening happens around now.", "Miscarriage risk drops sharply.",
            "Your energy may return.", "Sex can be seen on ultrasound.", "You may feel the first movements.",
            "Do not miss the anomaly scan.", "Check for anemia.", "Round ligament pain is common.",
            "Take iron and calcium seriously.", "Sleeping on your left side is better.", "The glucose test is near.",
            "Start counting fetal movements.", "Book a childbirth class.", "Swollen feet are common — elevate them.",
            "Know the signs of preterm labour.", "Pack your hospital bag.", "Practice contractions are normal.",
            "Baby's position is checked.", "Review your birth plan.", "Final weeks — rest and calm.",
            "Review the signs labour has started.",
        ][i % 29],
    })

CLINICS = [
    ("پژوهشگاه رویان", "Royan Institute", "تهران", "Tehran", "تهران، بزرگراه رسالت، خیابان بنی‌هاشم", "021-23562000", 4.9, "ivf,iui,lab,counseling", 20),
    ("مرکز ناباروری ابن‌سینا", "Avicenna Fertility Center", "تهران", "Tehran", "تهران، شهرک قدس، فلامک جنوبی", "021-88651000", 4.8, "ivf,iui,lab", 15),
    ("مرکز باروری و ناباروری اصفهان", "Isfahan Fertility Center", "اصفهان", "Isfahan", "اصفهان، خیابان شیخ صدوق شمالی", "031-36681000", 4.7, "ivf,counseling", 25),
    ("مرکز ناباروری میلاد", "Milad Fertility Clinic", "مشهد", "Mashhad", "مشهد، بلوار وکیل‌آباد", "051-38400000", 4.6, "iui,lab,counseling", 30),
    ("کلینیک زنان مهر", "Mehr Women's Clinic", "شیراز", "Shiraz", "شیراز، خیابان قصردشت", "071-36260000", 4.5, "iui,counseling", 20),
    ("مرکز ناباروری تبریز", "Tabriz Fertility Center", "تبریز", "Tabriz", "تبریز، خیابان آزادی", "041-33340000", 4.5, "ivf,lab", 18),
    ("کلینیک باروری کیش", "Kish Fertility Clinic", "کیش", "Kish", "کیش، میدان امیرکبیر", "076-44420000", 4.4, "ivf,iui", 22),
    ("مرکز سلامت زنان اهواز", "Ahvaz Women's Health", "اهواز", "Ahvaz", "اهواز، کیانپارس", "061-33330000", 4.3, "counseling,lab", 28),
]

ARTICLES = [
    ("fertile-window", "fertility", "پنجره باروری دقیقاً چیست؟", "What exactly is the fertile window?",
     "شش روزی که بیشترین شانس بارداری را دارند و چطور آن را پیدا کنیم.",
     "The six days with the highest chance of conception, and how to find them.",
     "پنجره باروری شامل پنج روز پیش از تخمک‌گذاری و خود روز تخمک‌گذاری است. اسپرم تا پنج روز در بدن زنده می‌ماند اما تخمک تنها ۱۲ تا ۲۴ ساعت فرصت لقاح دارد؛ به همین دلیل رابطه پیش از تخمک‌گذاری مؤثرتر از پس از آن است.",
     "The fertile window covers the five days before ovulation plus ovulation day itself. Sperm survive up to five days while the egg has only 12-24 hours, which is why intercourse before ovulation beats intercourse after it.", 4),
    ("bbt-guide", "fertility", "اندازه‌گیری دمای پایه بدن", "Tracking basal body temperature",
     "یک دماسنج ساده می‌تواند تخمک‌گذاری شما را تأیید کند.",
     "A simple thermometer can confirm that you ovulated.",
     "دمای پایه بدن را هر روز صبح پیش از بلند شدن از تخت و در ساعتی ثابت اندازه بگیرید. پس از تخمک‌گذاری، پروژسترون دما را حدود ۰٫۲ تا ۰٫۵ درجه بالا می‌برد و این افزایش تا پریود بعدی باقی می‌ماند.",
     "Take your temperature every morning before getting out of bed, at the same time. After ovulation progesterone lifts it by 0.2-0.5C and it stays up until your next period.", 5),
    ("pcos-basics", "fertility", "سندرم تخمدان پلی‌کیستیک به زبان ساده", "PCOS in plain language",
     "چرا چرخه نامنظم می‌شود و چه کارهایی کمک می‌کند.",
     "Why cycles become irregular and what actually helps.",
     "PCOS یکی از شایع‌ترین علت‌های چرخه نامنظم است. تغییر سبک زندگی، کنترل وزن و در صورت نیاز دارو، در بسیاری از افراد تخمک‌گذاری را برمی‌گرداند. اگر چرخه شما کوتاه‌تر از ۲۱ یا بلندتر از ۳۵ روز است، با متخصص زنان گفت‌وگو کنید.",
     "PCOS is among the most common causes of irregular cycles. Lifestyle change, weight management and, when needed, medication restore ovulation for many people. If your cycle is shorter than 21 or longer than 35 days, talk to a specialist.", 6),
    ("first-trimester", "pregnancy", "سه‌ماهه اول: چه انتظاری داشته باشیم", "First trimester: what to expect",
     "از تهوع صبحگاهی تا اولین سونوگرافی.",
     "From morning sickness to your first ultrasound.",
     "در سه‌ماهه اول، خستگی، تهوع و حساسیت سینه‌ها شایع است. مصرف روزانه فولیک‌اسید از پیش از بارداری تا پایان هفته دوازدهم توصیه می‌شود.",
     "Fatigue, nausea and breast tenderness are common. Daily folic acid from before conception through week twelve is recommended.", 5),
    ("postpartum-mind", "postpartum", "سلامت روان پس از زایمان", "Mental health after birth",
     "افسردگی پس از زایمان شایع است و درمان دارد.",
     "Postpartum depression is common and treatable.",
     "اگر بیش از دو هفته احساس غم، بی‌علاقگی یا اضطراب شدید دارید، این نشانه ضعف نیست؛ نشانه‌ای پزشکی است که درمان مؤثر دارد. با پزشک یا مشاور گفت‌وگو کنید.",
     "If sadness, loss of interest or heavy anxiety last more than two weeks, that is a medical sign with effective treatment, not a weakness. Talk to your doctor or a counsellor.", 4),
    ("miscarriage-support", "mind", "پس از سقط: با خودتان مهربان باشید", "After a loss: be kind to yourself",
     "سوگ طبیعی است و شما تنها نیستید.",
     "Grief is normal, and you are not alone.",
     "بیشتر سقط‌های زودرس به علت مشکلات کروموزومی اتفاق می‌افتند و تقصیر شما نیست. بیشتر افراد پس از یک سقط، بارداری سالم بعدی را تجربه می‌کنند.",
     "Most early losses are caused by chromosomal problems and are not your fault. Most people go on to have a healthy pregnancy afterwards.", 4),
]

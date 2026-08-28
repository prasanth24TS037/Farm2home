import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    appTitle: 'Farm2Home',
    tagline: 'Fresh produce directly from farmers to your doorstep',
    selectRole: 'Select your role to continue',
    farmerRole: 'Farmer',
    farmerDesc: 'Sell harvested produce directly at fair market prices with instant payouts.',
    customerRole: 'Customer',
    customerDesc: 'Browse farm-fresh organic produce with complete transparency on origin.',
    deliveryRole: 'Delivery Agent',
    deliveryDesc: 'Accept delivery tasks nearby, optimize routes, and earn steady income.',
    adminPortal: 'Admin Portal',
    welcomeBack: 'Welcome back',
    earningsThisMonth: 'Earnings this month',
    activeOrders: 'Active orders',
    lowStockAlert: 'Low-stock alert',
    quickActions: 'Quick actions',
    addProduct: 'Add product',
    updatePrice: 'Update price',
    updateStock: 'Update stock',
    viewOrders: 'View orders',
    myProducts: 'My products',
    stockStatus: 'Stock status',
    currentPrice: 'Current price',
    editPrice: 'Edit price',
    inStock: 'In stock',
    lowStock: 'Low stock',
    aiPriceHint: 'AI suggests ₹{price}',
    login: 'Login',
    register: 'Register',
    phoneOrEmail: 'Phone number or email',
    password: 'Password',
    otp: 'OTP (Use 1234 for demo)',
    sendOtp: 'Send OTP',
    verifyLogin: 'Verify & Login',
    searchPlaceholder: 'Search fresh vegetables, fruits, grains, or farmers...',
    addToCart: 'Add to cart',
    onDuty: 'On duty',
    offDuty: 'Off duty',
    totalDeliveries: 'Total deliveries today',
    completedSoFar: 'Completed so far',
    pickup: 'Pickup',
    drop: 'Drop',
    acceptJob: 'Accept delivery',
    markPickedUp: 'Mark picked up',
    outForDelivery: 'Out for delivery',
    markDelivered: 'Mark delivered',
    upcomingJobs: 'Upcoming deliveries',
    home: 'Home',
    route: 'Route',
    history: 'History',
    profile: 'Profile'
  },
  ta: {
    appTitle: 'Farm2Home (பண்ணை2வீடு)',
    tagline: 'விவசாயிகளிடமிருந்து நேரடியாக புதிய விளைபொருட்கள்',
    selectRole: 'தொடர உங்கள் பங்கைத் தேர்ந்தெடுக்கவும்',
    farmerRole: 'விவசாயி',
    farmerDesc: 'இடைத்தரகர் இல்லாமல் நியாயமான விலையில் நேரடியாக விற்கவும்.',
    customerRole: 'வாடிக்கையாளர்',
    customerDesc: 'பண்ணையிலிருந்து நேரடியாக புதிய காய்கறிகளை வாங்கவும்.',
    deliveryRole: 'டெலிவரி முகவர்',
    deliveryDesc: 'டெலிவரி பணிகளை ஏற்று நிலையான வருமானம் பெறவும்.',
    adminPortal: 'நிர்வாக தளம்',
    welcomeBack: 'மீண்டும் நல்வரவு',
    earningsThisMonth: 'இந்த மாத வருமானம்',
    activeOrders: 'செயலில் உள்ள ஆர்டர்கள்',
    lowStockAlert: 'குறைந்த இருப்பு எச்சரிக்கை',
    quickActions: 'விரைவு செயல்கள்',
    addProduct: 'பொருளைச் சேர்',
    updatePrice: 'விலை மாற்றம்',
    updateStock: 'இருப்பு மாற்றம்',
    viewOrders: 'ஆர்டர்களைப் பார்',
    myProducts: 'என் விளைபொருட்கள்',
    stockStatus: 'இருப்பு நிலை',
    currentPrice: 'தற்போதைய விலை',
    editPrice: 'விலை திருத்து',
    inStock: 'இருப்பில் உள்ளது',
    lowStock: 'குறைந்த இருப்பு',
    aiPriceHint: 'AI பரிந்துரை ₹{price}',
    login: 'உள்நுழைக',
    register: 'பதிவு செய்க',
    phoneOrEmail: 'தொலைபேசி எண் அல்லது மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    otp: 'OTP (டெமோ குறியீடு 1234)',
    sendOtp: 'OTP அனுப்பு',
    verifyLogin: 'சரிபார்த்து உள்நுழைக',
    searchPlaceholder: 'காய்கறிகள், பழங்கள், தானியங்களைத் தேடுங்கள்...',
    addToCart: 'கூடையில் சேர்',
    onDuty: 'பணியில் உள்ளார்',
    offDuty: 'விடுப்பில் உள்ளார்',
    totalDeliveries: 'இன்றைய மொத்த டெலிவரிகள்',
    completedSoFar: 'முடிக்கப்பட்டவை',
    pickup: 'பெறும் இடம்',
    drop: 'வழங்கும் இடம்',
    acceptJob: 'டெலிவரியை ஏற்றுக்கொள்',
    markPickedUp: 'பொருளைப் பெற்றேன்',
    outForDelivery: 'டெலிவரிக்கு புறப்பட்டது',
    markDelivered: 'டெலிவரி முடிந்தது',
    upcomingJobs: 'அடுத்த டெலிவரிகள்',
    home: 'முகப்பு',
    route: 'வழித்தடம்',
    history: 'வரலாறு',
    profile: 'சுயவிவரம்'
  },
  hi: {
    appTitle: 'Farm2Home (फार्म2होम)',
    tagline: 'सीधे किसानों से ताज़ा उपज आपके घर तक',
    selectRole: 'जारी रखने के लिए अपनी भूमिका चुनें',
    farmerRole: 'किसान',
    farmerDesc: 'बिचौलियों के बिना अपनी उपज सीधे उचित मूल्य पर बेचें।',
    customerRole: 'ग्राहक',
    customerDesc: 'खेत से सीधे ताज़ी सब्जियां और फल मंगवाएं।',
    deliveryRole: 'डिलीवरी एजेंट',
    deliveryDesc: 'आस-पास के डिलीवरी ऑर्डर स्वीकार करें और कमाई करें।',
    adminPortal: 'एडमिन पोर्टल',
    welcomeBack: 'स्वागत है',
    earningsThisMonth: 'इस महीने की कमाई',
    activeOrders: 'सक्रिय ऑर्डर',
    lowStockAlert: 'कम स्टॉक चेतावनी',
    quickActions: 'त्वरित कार्य',
    addProduct: 'उत्पाद जोड़ें',
    updatePrice: 'मूल्य बदलें',
    updateStock: 'स्टॉक बदलें',
    viewOrders: 'ऑर्डर देखें',
    myProducts: 'मेरे उत्पाद',
    stockStatus: 'स्टॉक स्थिति',
    currentPrice: 'वर्तमान मूल्य',
    editPrice: 'मूल्य बदलें',
    inStock: 'स्टॉक में उपलब्ध',
    lowStock: 'कम स्टॉक',
    aiPriceHint: 'AI सुझाव ₹{price}',
    login: 'लॉग इन करें',
    register: 'पंजीकरण करें',
    phoneOrEmail: 'फ़ोन नंबर या ईमेल',
    password: 'पासवर्ड',
    otp: 'ओटीपी (डेमो 1234)',
    sendOtp: 'ओटीपी भेजें',
    verifyLogin: 'लॉग इन करें',
    searchPlaceholder: 'सब्जियां, फल, अनाज या किसान खोजें...',
    addToCart: 'कार्ट में जोड़ें',
    onDuty: 'ड्यूटी पर',
    offDuty: 'छुट्टी पर',
    totalDeliveries: 'आज की कुल डिलीवरी',
    completedSoFar: 'पूरी हुई डिलीवरी',
    pickup: 'पिकअप',
    drop: 'ड्रॉप',
    acceptJob: 'डिलीवरी स्वीकार करें',
    markPickedUp: 'सामान उठाया',
    outForDelivery: 'डिलीवरी के लिए रवाना',
    markDelivered: 'डिलीवरी पूरी हुई',
    upcomingJobs: 'आगामी डिलीवरी',
    home: 'होम',
    route: 'रूट',
    history: 'इतिहास',
    profile: 'प्रोफ़ाइल'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('farm2home_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('farm2home_lang', lang);
  }, [lang]);

  const t = (key, params = {}) => {
    let text = (translations[lang] && translations[lang][key]) || translations.en[key] || key;
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    return text;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

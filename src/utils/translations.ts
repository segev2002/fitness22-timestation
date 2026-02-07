export type Language = 'he' | 'en';

export const translations = {
  he: {
    // Header
    appTitle: 'שעון נוכחות',
    appSubtitle: 'מערכת לניהול נוכחות עובדים',
    
    // Navigation
    navHome: 'בית',
    editActivity: 'עריכת פעילות',
    profile: 'פרופיל',
    logout: 'התנתקות',
    
    // Auth
    login: 'התחברות',
    register: 'הרשמה',
    createAccount: 'יצירת חשבון',
    email: 'אימייל',
    password: 'סיסמה',
    confirmPassword: 'אימות סיסמה',
    fullName: 'שם מלא',
    enterEmail: 'הכנס אימייל',
    enterPassword: 'הכנס סיסמה',
    enterName: 'הכנס שם מלא',
    reenterPassword: 'הכנס סיסמה שוב',
    noAccount: 'אין לך חשבון?',
    haveAccount: 'יש לך חשבון?',
    loginError: 'שגיאה בהתחברות',
    registrationError: 'שגיאה ברישום',
    userNotFound: 'משתמש לא נמצא',
    incorrectPassword: 'סיסמה שגויה',
    emailExists: 'אימייל כבר קיים במערכת',
    nameRequired: 'יש להזין שם',
    passwordMismatch: 'הסיסמאות לא תואמות',
    passwordTooShort: 'הסיסמה חייבת להכיל לפחות 6 תווים',
    userDisabled: 'המשתמש הושבת',
    
    // Password change
    changePassword: 'שנה סיסמה',
    currentPassword: 'סיסמה נוכחית',
    newPassword: 'סיסמה חדשה',
    passwordChanged: 'הסיסמה שונתה בהצלחה',
    
    // User management
    deleteUser: 'מחק משתמש',
    confirmDeleteUser: 'האם אתה בטוח שברצונך למחוק משתמש זה לצמיתות? פעולה זו תמחק את המשתמש ואת כל היסטוריית המשמרות שלו. לא ניתן לבטל פעולה זו!',
    cannotDeletePrimaryAdmin: 'לא ניתן למחוק את המנהל הראשי',
    cannotDeleteSelf: 'לא ניתן למחוק את עצמך',
    
    // Profile
    userProfile: 'פרופיל משתמש',
    memberSince: 'חבר מאז',
    editProfile: 'עריכת פרופיל',
    saveChanges: 'שמור שינויים',
  profileSaveSuccess: 'הפרופיל עודכן בהצלחה',
  profileSaveFailed: 'שמירת הפרופיל נכשלה',
    changePhoto: 'שנה תמונה',
    removePhoto: 'הסר תמונה',
    uploadPhoto: 'העלה תמונה',
    
    // Home
    currentMonthActivity: 'פעילות החודש הנוכחי',
    totalShifts: 'סה"כ משמרות',
    totalHours: 'סה"כ שעות',
    averageShift: 'משמרת ממוצעת',
    welcomeBack: 'ברוך שובך',
    
    // Status
    inShift: 'במשמרת',
    notInShift: 'לא במשמרת',
    workingFor: 'עובד כבר',
    
    // Employee selector
    selectEmployee: 'בחר עובד',
    
    // Buttons
    checkIn: 'כניסה',
    checkOut: 'יציאה',
    save: 'שמור',
    cancel: 'ביטול',
    clear: 'נקה בחירה',
    bulkFill: 'מילוי מרובה',
    applyTo: 'החל על',
    days: 'ימים',
    day: 'יום',
  employee: 'עובד',
    edit: 'ערוך',
    delete: 'מחק',
    
    // Notes
    addNote: 'הוסף הערה למשמרת...',
    note: 'הערה',
    optional: 'אופציונלי',
  // Export messaging (used in admin/export flows)
  month: 'חודש',
  noShiftsToExport: 'אין משמרות לייצוא בחודש הנבחר',
  selectEmployeeFirst: 'יש לבחור עובד',
    
    
    // History
    shiftHistory: 'היסטוריית משמרות',
    noShiftsToShow: 'אין משמרות להצגה',
    shiftsWillAppear: 'משמרות שתרשום יופיעו כאן',
    date: 'תאריך',
    checkInTime: 'כניסה',
    checkOutTime: 'יציאה',
    duration: 'משך',
    actions: 'פעולות',
    editShift: 'עריכת משמרת',
    confirmDelete: 'האם אתה בטוח שברצונך למחוק משמרת זו?',
  deleteReport: 'מחק דוח',
  confirmDeleteExpenseReport: 'האם אתה בטוח שברצונך למחוק דוח הוצאות זה?',
    
    // Calendar
    bulkCalendar: 'מילוי מרובה - לוח שנה',
    selected: 'נבחר',
    hasShift: 'יש משמרת',
    today: 'היום',
    daysSelected: 'ימים נבחרו',
    selectAtLeastOne: 'יש לבחור לפחות יום אחד',
    
    // Bulk form
    bulkFillTitle: 'מילוי מרובה',
    detailsWillApply: 'הפרטים יוחלו על',
    selectedDays: 'ימים נבחרים',
    checkInTimeLabel: 'שעת כניסה',
    checkOutTimeLabel: 'שעת יציאה',
    dayType: 'סוג יום עבודה',
    office: 'משרד',
    home: 'בית',
    sickDay: 'יום מחלה',
    other: 'אחר',
    
    // Day names
    days_short: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
    days_full: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    
    // Month names
    months: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 
             'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    
    // Duration
    hours: 'שעות',
    minutes: 'דקות',
    seconds: 'שניות',
    hoursAnd: 'שעות ו-',
    minutesShort: 'דקות',
    shifts: 'משמרות',
    unknownUser: 'משתמש לא ידוע',
    
    // Bulk work types
    workFromOffice: 'עבודה מהמשרד',
    workFromHome: 'עבודה מהבית',
    workSickDay: 'יום מחלה',
    workOther: 'אחר',
    
    // Language
    language: 'שפה',
    hebrew: 'עברית',
    english: 'English',
    
    // Theme
    theme: 'ערכת נושא',
    lightMode: 'מצב בהיר',
    darkMode: 'מצב כהה',
    
    // PWA Install
    installApp: 'התקן אפליקציה',
    openApp: 'פתח אפליקציה',
    iosInstallTitle: 'התקנה באייפון',
    iosInstallStep1: 'לחץ על כפתור השיתוף',
    iosInstallStep2: 'בחר "הוסף למסך הבית"',
    close: 'סגור',
    
    // Menu
    menu: 'תפריט',
    
    // Admin
    admin: 'ניהול',
    adminDashboard: 'לוח בקרה',
    allEmployees: 'כל העובדים',
    allShifts: 'כל המשמרות',
    liveCheckIns: 'כניסות בזמן אמת',
    addUser: 'הוסף משתמש',
    exportExcel: 'ייצא לאקסל',
    makeAdmin: 'הפוך למנהל',
    removeAdmin: 'הסר מנהל',
    department: 'מחלקה',
    selectDepartment: 'בחר מחלקה',
    userManagement: 'ניהול משתמשים',
    noUsersFound: 'לא נמצאו משתמשים',
    checkedInToday: 'נכחו היום',
    noOneCheckedIn: 'אף אחד לא נכח היום',
    primaryAdmin: 'מנהל ראשי',
    notAuthorized: 'אין הרשאה',
    onlyPrimaryAdmin: 'רק מנהל ראשי יכול לבצע פעולה זו',
    cannotDemotePrimaryAdmin: 'לא ניתן להסיר הרשאת מנהל ראשי',
    userCreated: 'המשתמש נוצר בהצלחה',
    
    // Break
    breakDuration: 'משך הפסקה',
    breakMinutes: 'דקות הפסקה',
    addBreak: 'הוסף הפסקה',
    
    // Sick Day
    sickDayButton: 'יום מחלה',
    sickDayNote: 'חולה בבית',
    sickDayAdded: 'יום מחלה נוסף',
    
    // Excel export
    totalWorkingDays: 'סה"כ ימי עבודה',
    totalWorkingHours: 'סה"כ שעות עבודה',
    employeeNotes: 'הערות עובד',
    
    // Expense Reports
    expenseReport: 'דוח הוצאות',
    expenseReports: 'דוחות הוצאות',
    expensePeriod: 'תקופת הוצאות',
    expensesInNIS: 'הוצאות בשקלים',
    expensesInUSD: 'הוצאות בדולרים',
    expensesInEUR: 'הוצאות באירו',
    quantity: 'כמות',
    description: 'תיאור',
    unitPrice: 'מחיר יחידה',
    lineTotal: 'סה"כ שורה',
    total: 'סה"כ',
    totalNIS: 'סה"כ ש"ח',
    totalUSD: 'סה"כ דולר',
    totalEUR: 'סה"כ אירו',
    exchangeRate: 'שער חליפין',
    grandTotal: 'סה"כ כללי',
    checkedBy: 'נבדק ע"י',
    approvedBy: 'אושר ע"י',
    addExpense: 'הוסף הוצאה',
    removeExpense: 'הסר הוצאה',
    uploadInvoice: 'העלה חשבונית',
    viewInvoice: 'צפה בחשבונית',
    removeInvoice: 'הסר חשבונית',
    saveExpenseReport: 'שמור דוח הוצאות',
    submitExpenseReport: 'שלח דוח הוצאות',
    sendExpenseReport: 'שלח את דוח ההוצאות',
    expenseReportSaved: 'דוח ההוצאות נשמר בהצלחה',
    expenseReportSubmitted: 'דוח ההוצאות נשלח לאישור',
    expenseReportApproved: 'דוח ההוצאות אושר',
    expenseReportRejected: 'דוח ההוצאות נדחה',
    noExpenses: 'אין הוצאות',
    noExpenseReports: 'אין דוחות הוצאות',
    draft: 'טיוטה',
    submitted: 'נשלח',
    approved: 'אושר',
    rejected: 'נדחה',
    approveReport: 'אשר דוח',
    rejectReport: 'דחה דוח',
    downloadPDF: 'הורד PDF',
    selectMonth: 'בחר חודש',
    invoiceRequired: 'יש להעלות חשבונית',
    enterDescription: 'הכנס תיאור',
    enterAmount: 'הכנס סכום',
  },
  en: {
    // Header
    appTitle: 'Time Clock',
    appSubtitle: 'Employee Attendance Management System',
    
    // Navigation
    navHome: 'Home',
    editActivity: 'Edit Activity',
    profile: 'Profile',
    logout: 'Logout',
    
    // Auth
    login: 'Login',
    register: 'Register',
    createAccount: 'Create Account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Full Name',
    enterEmail: 'Enter email',
    enterPassword: 'Enter password',
    enterName: 'Enter full name',
    reenterPassword: 'Re-enter password',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    loginError: 'Login error',
    registrationError: 'Registration error',
    userNotFound: 'User not found',
    incorrectPassword: 'Incorrect password',
    emailExists: 'Email already exists',
    nameRequired: 'Name is required',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    userDisabled: 'User account is disabled',
    
    // Password change
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    passwordChanged: 'Password changed successfully',
    
    // User management
    deleteUser: 'Delete User',
    confirmDeleteUser: 'Are you sure you want to permanently delete this user? This will remove the user and ALL their shift history. This action cannot be undone!',
    cannotDeletePrimaryAdmin: 'Cannot delete the primary admin',
    cannotDeleteSelf: 'Cannot delete yourself',
    
    // Profile
    userProfile: 'User Profile',
    memberSince: 'Member since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
  profileSaveSuccess: 'Profile updated successfully',
  profileSaveFailed: 'Failed to save profile',
    changePhoto: 'Change Photo',
    removePhoto: 'Remove Photo',
    uploadPhoto: 'Upload Photo',
    
    // Home
    currentMonthActivity: 'Current Month Activity',
    totalShifts: 'Total Shifts',
    totalHours: 'Total Hours',
    averageShift: 'Average Shift',
    welcomeBack: 'Welcome back',
    
    // Status
    inShift: 'In Shift',
    notInShift: 'Not in Shift',
    workingFor: 'Working for',
    
    // Employee selector
    selectEmployee: 'Select Employee',
    
    // Buttons
    checkIn: 'Check In',
    checkOut: 'Check Out',
    save: 'Save',
    cancel: 'Cancel',
    clear: 'Clear Selection',
    bulkFill: 'Bulk Fill',
    applyTo: 'Apply to',
    days: 'days',
    day: 'Day',
  employee: 'Employee',
    edit: 'Edit',
    delete: 'Delete',
    
    // Notes
    addNote: 'Add note to shift...',
    note: 'Note',
    optional: 'optional',
  // Export messaging (used in admin/export flows)
  month: 'Month',
  noShiftsToExport: 'No shifts to export for selected month',
  selectEmployeeFirst: 'Please select an employee',
    
    
    // History
    shiftHistory: 'Shift History',
    noShiftsToShow: 'No shifts to show',
    shiftsWillAppear: 'Shifts you record will appear here',
    date: 'Date',
    checkInTime: 'Check In',
    checkOutTime: 'Check Out',
    duration: 'Duration',
    actions: 'Actions',
    editShift: 'Edit Shift',
    confirmDelete: 'Are you sure you want to delete this shift?',
  deleteReport: 'Delete Report',
  confirmDeleteExpenseReport: 'Are you sure you want to delete this expense report?',
    
    // Calendar
    bulkCalendar: 'Bulk Fill - Calendar',
    selected: 'Selected',
    hasShift: 'Has Shift',
    today: 'Today',
    daysSelected: 'days selected',
    selectAtLeastOne: 'Please select at least one day',
    
    // Bulk form
    bulkFillTitle: 'Bulk Fill',
    detailsWillApply: 'Details will apply to',
    selectedDays: 'selected days',
    checkInTimeLabel: 'Check-in Time',
    checkOutTimeLabel: 'Check-out Time',
    dayType: 'Day Type',
    office: 'Office',
    home: 'Home',
    sickDay: 'Sick Day',
    other: 'Other',
    
    // Day names
    days_short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    days_full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    
    // Month names
    months: ['January', 'February', 'March', 'April', 'May', 'June', 
             'July', 'August', 'September', 'October', 'November', 'December'],
    
    // Duration
    hours: 'hours',
    minutes: 'minutes',
    seconds: 'seconds',
    hoursAnd: 'hours and ',
    minutesShort: 'min',
    shifts: 'shifts',
    unknownUser: 'Unknown User',
    
    // Bulk work types
    workFromOffice: 'Work from Office',
    workFromHome: 'Work from Home',
    workSickDay: 'Sick Day',
    workOther: 'Other',
    
    // Language
    language: 'Language',
    hebrew: 'עברית',
    english: 'English',
    
    // Theme
    theme: 'Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    
    // PWA Install
    installApp: 'Install App',
    openApp: 'Open App',
    iosInstallTitle: 'Install on iPhone',
    iosInstallStep1: 'Tap the Share button',
    iosInstallStep2: 'Select "Add to Home Screen"',
    close: 'Close',
    
    // Menu
    menu: 'Menu',
    
    // Admin
    admin: 'Admin',
    adminDashboard: 'Dashboard',
    allEmployees: 'All Employees',
    allShifts: 'All Shifts',
    liveCheckIns: 'Live Check-ins',
    addUser: 'Add User',
    exportExcel: 'Export Excel',
    makeAdmin: 'Make Admin',
    removeAdmin: 'Remove Admin',
    department: 'Department',
    selectDepartment: 'Select Department',
    userManagement: 'User Management',
    noUsersFound: 'No users found',
    checkedInToday: 'Checked in Today',
    noOneCheckedIn: 'No one checked in today',
    primaryAdmin: 'Primary Admin',
    notAuthorized: 'Not Authorized',
    onlyPrimaryAdmin: 'Only primary admin can perform this action',
    cannotDemotePrimaryAdmin: 'Cannot remove primary admin privileges',
    userCreated: 'User created successfully',
    
    // Break
    breakDuration: 'Break Duration',
    breakMinutes: 'Break (min)',
    addBreak: 'Add Break',
    
    // Sick Day
    sickDayButton: 'Sick Day',
    sickDayNote: 'Sick at home',
    sickDayAdded: 'Sick day added',
    
    // Excel export
    totalWorkingDays: 'Total Working Days',
    totalWorkingHours: 'Total Working Hours',
    employeeNotes: 'Employee Notes',
    
    // Expense Reports
    expenseReport: 'Expense Report',
    expenseReports: 'Expense Reports',
    expensePeriod: 'Expense Period',
    expensesInNIS: 'Expenses in NIS',
    expensesInUSD: 'Expenses in USD',
    expensesInEUR: 'Expenses in EUR',
    quantity: 'Qty',
    description: 'Description',
    unitPrice: 'Unit Price',
    lineTotal: 'Line Total',
    total: 'Total',
    totalNIS: 'Total NIS',
    totalUSD: 'Total USD',
    totalEUR: 'Total EUR',
    exchangeRate: 'Exchange Rate',
    grandTotal: 'Grand Total',
    checkedBy: 'Checked By',
    approvedBy: 'Approved By',
    addExpense: 'Add Expense',
    removeExpense: 'Remove Expense',
    uploadInvoice: 'Upload Invoice',
    viewInvoice: 'View Invoice',
    removeInvoice: 'Remove Invoice',
    saveExpenseReport: 'Save Expense Report',
    submitExpenseReport: 'Submit Expense Report',
    sendExpenseReport: 'Send the expense report',
    expenseReportSaved: 'Expense report saved successfully',
    expenseReportSubmitted: 'Expense report submitted for approval',
    expenseReportApproved: 'Expense report approved',
    expenseReportRejected: 'Expense report rejected',
    noExpenses: 'No expenses',
    noExpenseReports: 'No expense reports',
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    approveReport: 'Approve Report',
    rejectReport: 'Reject Report',
    downloadPDF: 'Download PDF',
    selectMonth: 'Select Month',
    invoiceRequired: 'Invoice is required',
    enterDescription: 'Enter description',
    enterAmount: 'Enter amount',
  }
};

export const getTranslation = (lang: Language) => translations[lang];

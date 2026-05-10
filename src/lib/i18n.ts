// Internationalization (i18n) system for Hisab Pro
// Supports: English (en), Nepali (ne), Hindi (hi)

export type Locale = 'en' | 'ne' | 'hi'

export interface TranslationStrings {
  // Common
  save: string
  cancel: string
  delete: string
  edit: string
  create: string
  search: string
  loading: string
  no_results: string
  confirm: string
  close: string
  back: string
  next: string
  previous: string
  submit: string
  reset: string
  yes: string
  no: string
  actions: string
  status: string
  date: string
  amount: string
  total: string
  description: string
  notes: string
  name: string
  type: string
  code: string
  filter: string
  export: string
  import: string
  print: string
  refresh: string
  view: string
  download: string
  upload: string
  error: string
  success: string
  warning: string
  info: string
  required: string
  optional: string
  active: string
  inactive: string
  all: string
  none: string
  other: string
  more: string
  less: string

  // Navigation
  dashboard: string
  chart_of_accounts: string
  journal_entries: string
  invoices: string
  purchases: string
  inventory: string
  parties: string
  reports: string
  settings: string
  organization: string
  users: string
  sales: string
  ledger: string

  // Accounting
  debit: string
  credit: string
  balance: string
  account: string
  asset: string
  liability: string
  equity: string
  income: string
  expense: string
  vat: string
  tds: string
  trial_balance: string
  profit_loss: string
  balance_sheet: string
  cash_flow: string
  opening_balance: string
  current_balance: string
  closing_balance: string
  journal_entry: string
  voucher: string
  narration: string
  posting: string
  double_entry: string
  contra: string
  receipt: string
  payment: string
  receivable: string
  payable: string
  capital: string
  retained_earnings: string
  depreciation: string
  cost_of_goods_sold: string
  taxable_amount: string
  vat_amount: string
  total_amount: string
  subtotal: string
  discount: string
  net_amount: string
  currency_npr: string

  // Auth
  login: string
  register: string
  email: string
  password: string
  confirm_password: string
  name_label: string
  business_name: string
  logout: string
  welcome: string
  forgot_password: string
  reset_password: string
  change_password: string
  profile: string
  sign_in: string
  sign_up: string
  already_have_account: string
  dont_have_account: string
  invalid_credentials: string
  registration_success: string
  login_success: string
  logout_success: string
  email_required: string
  password_required: string
  password_min_length: string
  passwords_dont_match: string
  email_already_exists: string

  // Plans
  free: string
  pro: string
  enterprise: string
  monthly: string
  yearly: string
  upgrade: string
  downgrade: string
  current_plan: string
  features: string
  limited_access: string
  all_features: string
  contact_us: string
  trial_period: string
  trial_ends: string
  subscription_active: string
  subscription_expired: string
  days_remaining: string
  unlimited: string

  // Simple mode
  add_income: string
  add_expense: string
  quick_entry: string
  income_category: string
  expense_category: string
  payment_method: string
  cash: string
  bank: string
  online: string
  cheque: string
  from_party: string
  to_party: string
  received_from: string
  paid_to: string
  simple_mode: string
  advanced_mode: string

  // Admin
  admin_portal: string
  manage_users: string
  manage_subscriptions: string
  all_organizations: string
  system_settings: string
  super_admin: string
  user_management: string
  activate: string
  deactivate: string
  user_status: string
  plan_type: string
  organization_name: string
  created_at: string
  updated_at: string
  last_login: string

  // Invoices & Sales
  invoice_number: string
  invoice_date: string
  due_date: string
  bill_to: string
  ship_to: string
  quantity: string
  unit_price: string
  line_total: string
  draft: string
  sent: string
  paid: string
  partial: string
  overdue: string
  cancelled: string
  mark_as_paid: string
  mark_as_sent: string
  cancel_invoice: string
  new_invoice: string
  sales_return: string

  // Purchases
  purchase_bill: string
  supplier: string
  customer: string
  bill_number: string
  bill_date: string
  purchase_return: string
  new_purchase: string
  received: string

  // Inventory
  product: string
  products: string
  warehouse: string
  stock: string
  stock_in: string
  stock_out: string
  stock_adjustment: string
  low_stock: string
  out_of_stock: string
  in_stock: string
  sku: string
  unit: string
  category: string
  brand: string
  selling_price: string
  cost_price: string
  min_stock: string
  max_stock: string
  batch_number: string
  expiry_date: string

  // Parties
  party: string
  customer_label: string
  supplier_label: string
  employee: string
  both: string
  pan_number: string
  credit_limit: string
  contact_person: string
  province: string
  city: string
  address: string
  phone: string
  bank_name: string
  bank_account: string
  tds_applicable: string
  ssf_applicable: string

  // Reports
  report_type: string
  period: string
  from_date: string
  to_date: string
  generate_report: string
  financial_summary: string
  monthly_summary: string
  yearly_summary: string
  vat_report: string
  tds_report: string

  // Fiscal Year
  fiscal_year: string
  is_current: string
  is_locked: string
  lock_period: string

  // Settings
  preferences: string
  language: string
  theme: string
  light: string
  dark: string
  system: string
  tax_configuration: string
  vat_enabled: string
  tds_enabled: string
  ssf_enabled: string
  default_warehouse: string
  invoice_prefix: string
  bill_prefix: string
  journal_prefix: string
}

const translations: Record<Locale, TranslationStrings> = {
  en: {
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    search: 'Search',
    loading: 'Loading...',
    no_results: 'No results found',
    confirm: 'Confirm',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',
    yes: 'Yes',
    no: 'No',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    amount: 'Amount',
    total: 'Total',
    description: 'Description',
    notes: 'Notes',
    name: 'Name',
    type: 'Type',
    code: 'Code',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    refresh: 'Refresh',
    view: 'View',
    download: 'Download',
    upload: 'Upload',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info',
    required: 'Required',
    optional: 'Optional',
    active: 'Active',
    inactive: 'Inactive',
    all: 'All',
    none: 'None',
    other: 'Other',
    more: 'More',
    less: 'Less',

    // Navigation
    dashboard: 'Dashboard',
    chart_of_accounts: 'Chart of Accounts',
    journal_entries: 'Journal Entries',
    invoices: 'Invoices',
    purchases: 'Purchases',
    inventory: 'Inventory',
    parties: 'Parties',
    reports: 'Reports',
    settings: 'Settings',
    organization: 'Organization',
    users: 'Users',
    sales: 'Sales',
    ledger: 'Ledger',

    // Accounting
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
    account: 'Account',
    asset: 'Asset',
    liability: 'Liability',
    equity: 'Equity',
    income: 'Income',
    expense: 'Expense',
    vat: 'VAT',
    tds: 'TDS',
    trial_balance: 'Trial Balance',
    profit_loss: 'Profit & Loss',
    balance_sheet: 'Balance Sheet',
    cash_flow: 'Cash Flow',
    opening_balance: 'Opening Balance',
    current_balance: 'Current Balance',
    closing_balance: 'Closing Balance',
    journal_entry: 'Journal Entry',
    voucher: 'Voucher',
    narration: 'Narration',
    posting: 'Posting',
    double_entry: 'Double Entry',
    contra: 'Contra',
    receipt: 'Receipt',
    payment: 'Payment',
    receivable: 'Receivable',
    payable: 'Payable',
    capital: 'Capital',
    retained_earnings: 'Retained Earnings',
    depreciation: 'Depreciation',
    cost_of_goods_sold: 'Cost of Goods Sold',
    taxable_amount: 'Taxable Amount',
    vat_amount: 'VAT Amount',
    total_amount: 'Total Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    net_amount: 'Net Amount',
    currency_npr: 'NPR',

    // Auth
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm Password',
    name_label: 'Name',
    business_name: 'Business Name',
    logout: 'Logout',
    welcome: 'Welcome',
    forgot_password: 'Forgot Password?',
    reset_password: 'Reset Password',
    change_password: 'Change Password',
    profile: 'Profile',
    sign_in: 'Sign In',
    sign_up: 'Sign Up',
    already_have_account: 'Already have an account?',
    dont_have_account: "Don't have an account?",
    invalid_credentials: 'Invalid email or password',
    registration_success: 'Registration successful!',
    login_success: 'Login successful!',
    logout_success: 'Logged out successfully',
    email_required: 'Email is required',
    password_required: 'Password is required',
    password_min_length: 'Password must be at least 6 characters',
    passwords_dont_match: 'Passwords do not match',
    email_already_exists: 'Email already registered',

    // Plans
    free: 'Free',
    pro: 'Pro',
    enterprise: 'Enterprise',
    monthly: 'Monthly',
    yearly: 'Yearly',
    upgrade: 'Upgrade',
    downgrade: 'Downgrade',
    current_plan: 'Current Plan',
    features: 'Features',
    limited_access: 'Limited Access',
    all_features: 'All Features',
    contact_us: 'Contact Us',
    trial_period: 'Trial Period',
    trial_ends: 'Trial Ends',
    subscription_active: 'Subscription Active',
    subscription_expired: 'Subscription Expired',
    days_remaining: 'days remaining',
    unlimited: 'Unlimited',

    // Simple mode
    add_income: 'Add Income',
    add_expense: 'Add Expense',
    quick_entry: 'Quick Entry',
    income_category: 'Income Category',
    expense_category: 'Expense Category',
    payment_method: 'Payment Method',
    cash: 'Cash',
    bank: 'Bank',
    online: 'Online',
    cheque: 'Cheque',
    from_party: 'From Party',
    to_party: 'To Party',
    received_from: 'Received From',
    paid_to: 'Paid To',
    simple_mode: 'Simple Mode',
    advanced_mode: 'Advanced Mode',

    // Admin
    admin_portal: 'Admin Portal',
    manage_users: 'Manage Users',
    manage_subscriptions: 'Manage Subscriptions',
    all_organizations: 'All Organizations',
    system_settings: 'System Settings',
    super_admin: 'Super Admin',
    user_management: 'User Management',
    activate: 'Activate',
    deactivate: 'Deactivate',
    user_status: 'User Status',
    plan_type: 'Plan Type',
    organization_name: 'Organization Name',
    created_at: 'Created At',
    updated_at: 'Updated At',
    last_login: 'Last Login',

    // Invoices & Sales
    invoice_number: 'Invoice Number',
    invoice_date: 'Invoice Date',
    due_date: 'Due Date',
    bill_to: 'Bill To',
    ship_to: 'Ship To',
    quantity: 'Quantity',
    unit_price: 'Unit Price',
    line_total: 'Line Total',
    draft: 'Draft',
    sent: 'Sent',
    paid: 'Paid',
    partial: 'Partial',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
    mark_as_paid: 'Mark as Paid',
    mark_as_sent: 'Mark as Sent',
    cancel_invoice: 'Cancel Invoice',
    new_invoice: 'New Invoice',
    sales_return: 'Sales Return',

    // Purchases
    purchase_bill: 'Purchase Bill',
    supplier: 'Supplier',
    customer: 'Customer',
    bill_number: 'Bill Number',
    bill_date: 'Bill Date',
    purchase_return: 'Purchase Return',
    new_purchase: 'New Purchase',
    received: 'Received',

    // Inventory
    product: 'Product',
    products: 'Products',
    warehouse: 'Warehouse',
    stock: 'Stock',
    stock_in: 'Stock In',
    stock_out: 'Stock Out',
    stock_adjustment: 'Stock Adjustment',
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    in_stock: 'In Stock',
    sku: 'SKU',
    unit: 'Unit',
    category: 'Category',
    brand: 'Brand',
    selling_price: 'Selling Price',
    cost_price: 'Cost Price',
    min_stock: 'Min Stock',
    max_stock: 'Max Stock',
    batch_number: 'Batch Number',
    expiry_date: 'Expiry Date',

    // Parties
    party: 'Party',
    customer_label: 'Customer',
    supplier_label: 'Supplier',
    employee: 'Employee',
    both: 'Both',
    pan_number: 'PAN Number',
    credit_limit: 'Credit Limit',
    contact_person: 'Contact Person',
    province: 'Province',
    city: 'City',
    address: 'Address',
    phone: 'Phone',
    bank_name: 'Bank Name',
    bank_account: 'Bank Account',
    tds_applicable: 'TDS Applicable',
    ssf_applicable: 'SSF Applicable',

    // Reports
    report_type: 'Report Type',
    period: 'Period',
    from_date: 'From Date',
    to_date: 'To Date',
    generate_report: 'Generate Report',
    financial_summary: 'Financial Summary',
    monthly_summary: 'Monthly Summary',
    yearly_summary: 'Yearly Summary',
    vat_report: 'VAT Report',
    tds_report: 'TDS Report',

    // Fiscal Year
    fiscal_year: 'Fiscal Year',
    is_current: 'Current',
    is_locked: 'Locked',
    lock_period: 'Lock Period',

    // Settings
    preferences: 'Preferences',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    tax_configuration: 'Tax Configuration',
    vat_enabled: 'VAT Enabled',
    tds_enabled: 'TDS Enabled',
    ssf_enabled: 'SSF Enabled',
    default_warehouse: 'Default Warehouse',
    invoice_prefix: 'Invoice Prefix',
    bill_prefix: 'Bill Prefix',
    journal_prefix: 'Journal Prefix',
  },

  ne: {
    // Common
    save: 'सुरक्षित गर्नुहोस्',
    cancel: 'रद्द गर्नुहोस्',
    delete: 'मेटाउनुहोस्',
    edit: 'सम्पादन गर्नुहोस्',
    create: 'सिर्जना गर्नुहोस्',
    search: 'खोज्नुहोस्',
    loading: 'लोड हुँदैछ...',
    no_results: 'नतिजा भेटिएन',
    confirm: 'पुष्टि गर्नुहोस्',
    close: 'बन्द गर्नुहोस्',
    back: 'पछाडि',
    next: 'अर्को',
    previous: 'अघिल्लो',
    submit: 'बुझाउनुहोस्',
    reset: 'रिसेट गर्नुहोस्',
    yes: 'हो',
    no: 'होइन',
    actions: 'कार्यहरू',
    status: 'स्थिति',
    date: 'मिति',
    amount: 'रकम',
    total: 'जम्मा',
    description: 'विवरण',
    notes: 'नोट',
    name: 'नाम',
    type: 'प्रकार',
    code: 'कोड',
    filter: 'फिल्टर',
    export: 'निर्यात',
    import: 'आयात',
    print: 'प्रिन्ट',
    refresh: 'रिफ्रेश',
    view: 'हेर्नुहोस्',
    download: 'डाउनलोड',
    upload: 'अपलोड',
    error: 'त्रुटि',
    success: 'सफल',
    warning: 'चेतावनी',
    info: 'जानकारी',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
    active: 'सक्रिय',
    inactive: 'निष्क्रिय',
    all: 'सबै',
    none: 'कुनै पनि होइन',
    other: 'अन्य',
    more: 'थप',
    less: 'कम',

    // Navigation
    dashboard: 'ड्यासबोर्ड',
    chart_of_accounts: 'खाता योजना',
    journal_entries: 'जर्नल प्रविष्टि',
    invoices: 'इनभ्वाइस',
    purchases: 'खरिद',
    inventory: 'इन्भेन्ट्री',
    parties: 'पार्टी',
    reports: 'रिपोर्ट',
    settings: 'सेटिङ',
    organization: 'संस्था',
    users: 'प्रयोगकर्ता',
    sales: 'बिक्री',
    ledger: 'खाता',

    // Accounting
    debit: 'डेबिट',
    credit: 'क्रेडिट',
    balance: 'मौज्दात',
    account: 'खाता',
    asset: 'सम्पत्ति',
    liability: 'दायित्व',
    equity: 'इक्विटी',
    income: 'आम्दानी',
    expense: 'खर्च',
    vat: 'भ्याट',
    tds: 'टीडीएस',
    trial_balance: 'ट्रायल ब्यालेन्स',
    profit_loss: 'नाफा नोक्सान',
    balance_sheet: 'ब्यालेन्स सिट',
    cash_flow: 'नगद प्रवाह',
    opening_balance: 'सुरु मौज्दात',
    current_balance: 'हालको मौज्दात',
    closing_balance: 'अन्तिम मौज्दात',
    journal_entry: 'जर्नल प्रविष्टि',
    voucher: 'भौचर',
    narration: 'विवरण',
    posting: 'पोस्टिङ',
    double_entry: 'डबल एन्ट्री',
    contra: 'कन्ट्रा',
    receipt: 'प्राप्ति',
    payment: 'भुक्तानी',
    receivable: 'प्राप्य',
    payable: 'देय',
    capital: 'पूँजी',
    retained_earnings: 'सञ्चित आम्दानी',
    depreciation: 'ह्रास',
    cost_of_goods_sold: 'बेचिएको वस्तुको लागत',
    taxable_amount: 'करयोग्य रकम',
    vat_amount: 'भ्याट रकम',
    total_amount: 'कुल रकम',
    subtotal: 'उपजम्मा',
    discount: 'छुट',
    net_amount: 'खुद रकम',
    currency_npr: 'रु',

    // Auth
    login: 'लगइन',
    register: 'दर्ता',
    email: 'इमेल',
    password: 'पासवर्ड',
    confirm_password: 'पासवर्ड पुष्टि',
    name_label: 'नाम',
    business_name: 'व्यवसायको नाम',
    logout: 'लगआउट',
    welcome: 'स्वागत छ',
    forgot_password: 'पासवर्ड बिर्सनुभयो?',
    reset_password: 'पासवर्ड रिसेट',
    change_password: 'पासवर्ड परिवर्तन',
    profile: 'प्रोफाइल',
    sign_in: 'साइन इन',
    sign_up: 'साइन अप',
    already_have_account: 'पहिले नै खाता छ?',
    dont_have_account: 'खाता छैन?',
    invalid_credentials: 'गलत इमेल वा पासवर्ड',
    registration_success: 'दर्ता सफल!',
    login_success: 'लगइन सफल!',
    logout_success: 'लगआउट सफल',
    email_required: 'इमेल आवश्यक छ',
    password_required: 'पासवर्ड आवश्यक छ',
    password_min_length: 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ',
    passwords_dont_match: 'पासवर्ड मेल खाँदैन',
    email_already_exists: 'इमेल पहिले नै दर्ता छ',

    // Plans
    free: 'निःशुल्क',
    pro: 'प्रो',
    enterprise: 'एन्टरप्राइज',
    monthly: 'मासिक',
    yearly: 'वार्षिक',
    upgrade: 'अपग्रेड',
    downgrade: 'डाउनग्रेड',
    current_plan: 'हालको योजना',
    features: 'विशेषताहरू',
    limited_access: 'सीमित पहुँच',
    all_features: 'सबै विशेषताहरू',
    contact_us: 'हामीलाई सम्पर्क गर्नुहोस्',
    trial_period: 'परीक्षण अवधि',
    trial_ends: 'परीक्षण समाप्त',
    subscription_active: 'सदस्यता सक्रिय',
    subscription_expired: 'सदस्यता समाप्त',
    days_remaining: 'दिन बाँकी',
    unlimited: 'असीमित',

    // Simple mode
    add_income: 'आम्दानी थप्नुहोस्',
    add_expense: 'खर्च थप्नुहोस्',
    quick_entry: 'द्रुत प्रविष्टि',
    income_category: 'आम्दानी श्रेणी',
    expense_category: 'खर्च श्रेणी',
    payment_method: 'भुक्तानी विधि',
    cash: 'नगद',
    bank: 'बैंक',
    online: 'अनलाइन',
    cheque: 'चेक',
    from_party: 'पार्टीबाट',
    to_party: 'पार्टीमा',
    received_from: 'बाट प्राप्त',
    paid_to: 'लाई भुक्तानी',
    simple_mode: 'सरल मोड',
    advanced_mode: 'उन्नत मोड',

    // Admin
    admin_portal: 'प्रशासन पोर्टल',
    manage_users: 'प्रयोगकर्ता व्यवस्थापन',
    manage_subscriptions: 'सदस्यता व्यवस्थापन',
    all_organizations: 'सबै संस्थाहरू',
    system_settings: 'प्रणाली सेटिङ',
    super_admin: 'सुपर प्रशासक',
    user_management: 'प्रयोगकर्ता व्यवस्थापन',
    activate: 'सक्रिय गर्नुहोस्',
    deactivate: 'निष्क्रिय गर्नुहोस्',
    user_status: 'प्रयोगकर्ता स्थिति',
    plan_type: 'योजना प्रकार',
    organization_name: 'संस्थाको नाम',
    created_at: 'सिर्जना मिति',
    updated_at: 'अद्यावधिक मिति',
    last_login: 'अन्तिम लगइन',

    // Invoices & Sales
    invoice_number: 'इनभ्वाइस नम्बर',
    invoice_date: 'इनभ्वाइस मिति',
    due_date: 'देय मिति',
    bill_to: 'बिल गर्ने',
    ship_to: 'शिप गर्ने',
    quantity: 'परिमाण',
    unit_price: 'एकाइ मूल्य',
    line_total: 'लाइन जम्मा',
    draft: 'ड्राफ्ट',
    sent: 'पठाइएको',
    paid: 'भुक्तानी भएको',
    partial: 'आंशिक',
    overdue: 'अतिरिक्त',
    cancelled: 'रद्द',
    mark_as_paid: 'भुक्तानी भएको चिन्ह',
    mark_as_sent: 'पठाइएको चिन्ह',
    cancel_invoice: 'इनभ्वाइस रद्द',
    new_invoice: 'नयाँ इनभ्वाइस',
    sales_return: 'बिक्री फिर्ता',

    // Purchases
    purchase_bill: 'खरिद बिल',
    supplier: 'आपूर्तिकर्ता',
    customer: 'ग्राहक',
    bill_number: 'बिल नम्बर',
    bill_date: 'बिल मिति',
    purchase_return: 'खरिद फिर्ता',
    new_purchase: 'नयाँ खरिद',
    received: 'प्राप्त',

    // Inventory
    product: 'उत्पादन',
    products: 'उत्पादनहरू',
    warehouse: 'गोदाम',
    stock: 'स्टक',
    stock_in: 'स्टक आवक',
    stock_out: 'स्टक जावक',
    stock_adjustment: 'स्टक समायोजन',
    low_stock: 'कम स्टक',
    out_of_stock: 'स्टक सकियो',
    in_stock: 'स्टकमा छ',
    sku: 'SKU',
    unit: 'एकाइ',
    category: 'श्रेणी',
    brand: 'ब्रान्ड',
    selling_price: 'बिक्री मूल्य',
    cost_price: 'लागत मूल्य',
    min_stock: 'न्यूनतम स्टक',
    max_stock: 'अधिकतम स्टक',
    batch_number: 'ब्याच नम्बर',
    expiry_date: 'समाप्ति मिति',

    // Parties
    party: 'पार्टी',
    customer_label: 'ग्राहक',
    supplier_label: 'आपूर्तिकर्ता',
    employee: 'कर्मचारी',
    both: 'दुवै',
    pan_number: 'प्यान नम्बर',
    credit_limit: 'क्रेडिट सीमा',
    contact_person: 'सम्पर्क व्यक्ति',
    province: 'प्रदेश',
    city: 'शहर',
    address: 'ठेगाना',
    phone: 'फोन',
    bank_name: 'बैंकको नाम',
    bank_account: 'बैंक खाता',
    tds_applicable: 'टीडीएस लागू',
    ssf_applicable: 'SSF लागू',

    // Reports
    report_type: 'रिपोर्ट प्रकार',
    period: 'अवधि',
    from_date: 'बाट मिति',
    to_date: 'सम्म मिति',
    generate_report: 'रिपोर्ट उत्पन्न',
    financial_summary: 'वित्तीय सारांश',
    monthly_summary: 'मासिक सारांश',
    yearly_summary: 'वार्षिक सारांश',
    vat_report: 'भ्याट रिपोर्ट',
    tds_report: 'टीडीएस रिपोर्ट',

    // Fiscal Year
    fiscal_year: 'आर्थिक वर्ष',
    is_current: 'हालको',
    is_locked: 'लक गरिएको',
    lock_period: 'अवधि लक',

    // Settings
    preferences: 'प्राथमिकताहरू',
    language: 'भाषा',
    theme: 'विषयवस्तु',
    light: 'लाइट',
    dark: 'डार्क',
    system: 'प्रणाली',
    tax_configuration: 'कर विन्यास',
    vat_enabled: 'भ्याट सक्षम',
    tds_enabled: 'टीडीएस सक्षम',
    ssf_enabled: 'SSF सक्षम',
    default_warehouse: 'पूर्वनिर्धारित गोदाम',
    invoice_prefix: 'इनभ्वाइस उपसर्ग',
    bill_prefix: 'बिल उपसर्ग',
    journal_prefix: 'जर्नल उपसर्ग',
  },

  hi: {
    // Common
    save: 'सेव करें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    create: 'बनाएं',
    search: 'खोजें',
    loading: 'लोड हो रहा है...',
    no_results: 'कोई परिणाम नहीं मिला',
    confirm: 'पुष्टि करें',
    close: 'बंद करें',
    back: 'वापस',
    next: 'अगला',
    previous: 'पिछला',
    submit: 'जमा करें',
    reset: 'रीसेट',
    yes: 'हां',
    no: 'नहीं',
    actions: 'कार्रवाई',
    status: 'स्थिति',
    date: 'तारीख',
    amount: 'राशि',
    total: 'कुल',
    description: 'विवरण',
    notes: 'नोट',
    name: 'नाम',
    type: 'प्रकार',
    code: 'कोड',
    filter: 'फ़िल्टर',
    export: 'निर्यात',
    import: 'आयात',
    print: 'प्रिंट',
    refresh: 'रीफ़्रेश',
    view: 'देखें',
    download: 'डाउनलोड',
    upload: 'अपलोड',
    error: 'त्रुटि',
    success: 'सफल',
    warning: 'चेतावनी',
    info: 'जानकारी',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
    active: 'सक्रिय',
    inactive: 'निष्क्रिय',
    all: 'सभी',
    none: 'कोई नहीं',
    other: 'अन्य',
    more: 'अधिक',
    less: 'कम',

    // Navigation
    dashboard: 'डैशबोर्ड',
    chart_of_accounts: 'खाता योजना',
    journal_entries: 'जर्नल प्रविष्टि',
    invoices: 'इनवॉइस',
    purchases: 'खरीद',
    inventory: 'इन्वेंट्री',
    parties: 'पार्टी',
    reports: 'रिपोर्ट',
    settings: 'सेटिंग्स',
    organization: 'संगठन',
    users: 'उपयोगकर्ता',
    sales: 'बिक्री',
    ledger: 'लेजर',

    // Accounting
    debit: 'डेबिट',
    credit: 'क्रेडिट',
    balance: 'शेष',
    account: 'खाता',
    asset: 'संपत्ति',
    liability: 'देनदारी',
    equity: 'इक्विटी',
    income: 'आय',
    expense: 'व्यय',
    vat: 'वैट',
    tds: 'टीडीएस',
    trial_balance: 'ट्रायल बैलेंस',
    profit_loss: 'लाभ हानि',
    balance_sheet: 'बैलेंस शीट',
    cash_flow: 'नकद प्रवाह',
    opening_balance: 'आरंभिक शेष',
    current_balance: 'वर्तमान शेष',
    closing_balance: 'अंतिम शेष',
    journal_entry: 'जर्नल प्रविष्टि',
    voucher: 'वाउचर',
    narration: 'विवरण',
    posting: 'पोस्टिंग',
    double_entry: 'डबल एंट्री',
    contra: 'कॉन्ट्रा',
    receipt: 'रसीद',
    payment: 'भुगतान',
    receivable: 'प्राप्य',
    payable: 'देय',
    capital: 'पूंजी',
    retained_earnings: 'प्राप्य आय',
    depreciation: 'मूल्यह्रास',
    cost_of_goods_sold: 'बेची गई वस्तुओं की लागत',
    taxable_amount: 'कर योग्य राशि',
    vat_amount: 'वैट राशि',
    total_amount: 'कुल राशि',
    subtotal: 'उपकुल',
    discount: 'छूट',
    net_amount: 'शुद्ध राशि',
    currency_npr: 'रु',

    // Auth
    login: 'लॉगिन',
    register: 'रजिस्टर',
    email: 'ईमेल',
    password: 'पासवर्ड',
    confirm_password: 'पासवर्ड की पुष्टि',
    name_label: 'नाम',
    business_name: 'व्यवसाय का नाम',
    logout: 'लॉगआउट',
    welcome: 'स्वागत है',
    forgot_password: 'पासवर्ड भूल गए?',
    reset_password: 'पासवर्ड रीसेट',
    change_password: 'पासवर्ड बदलें',
    profile: 'प्रोफाइल',
    sign_in: 'साइन इन',
    sign_up: 'साइन अप',
    already_have_account: 'पहले से खाता है?',
    dont_have_account: 'खाता नहीं है?',
    invalid_credentials: 'गलत ईमेल या पासवर्ड',
    registration_success: 'रजिस्ट्रेशन सफल!',
    login_success: 'लॉगिन सफल!',
    logout_success: 'लॉगआउट सफल',
    email_required: 'ईमेल आवश्यक है',
    password_required: 'पासवर्ड आवश्यक है',
    password_min_length: 'पासवर्ड कम से कम 6 अक्षर का होना चाहिए',
    passwords_dont_match: 'पासवर्ड मेल नहीं खाते',
    email_already_exists: 'ईमेल पहले से पंजीकृत है',

    // Plans
    free: 'मुफ्त',
    pro: 'प्रो',
    enterprise: 'एंटरप्राइज',
    monthly: 'मासिक',
    yearly: 'वार्षिक',
    upgrade: 'अपग्रेड',
    downgrade: 'डाउनग्रेड',
    current_plan: 'वर्तमान योजना',
    features: 'सुविधाएं',
    limited_access: 'सीमित पहुंच',
    all_features: 'सभी सुविधाएं',
    contact_us: 'हमसे संपर्क करें',
    trial_period: 'परीक्षण अवधि',
    trial_ends: 'परीक्षण समाप्त',
    subscription_active: 'सदस्यता सक्रिय',
    subscription_expired: 'सदस्यता समाप्त',
    days_remaining: 'दिन शेष',
    unlimited: 'असीमित',

    // Simple mode
    add_income: 'आय जोड़ें',
    add_expense: 'व्यय जोड़ें',
    quick_entry: 'त्वरित प्रविष्टि',
    income_category: 'आय श्रेणी',
    expense_category: 'व्यय श्रेणी',
    payment_method: 'भुगतान विधि',
    cash: 'नकद',
    bank: 'बैंक',
    online: 'ऑनलाइन',
    cheque: 'चेक',
    from_party: 'पार्टी से',
    to_party: 'पार्टी को',
    received_from: 'से प्राप्त',
    paid_to: 'को भुगतान',
    simple_mode: 'सरल मोड',
    advanced_mode: 'उन्नत मोड',

    // Admin
    admin_portal: 'एडमिन पोर्टल',
    manage_users: 'उपयोगकर्ता प्रबंधन',
    manage_subscriptions: 'सदस्यता प्रबंधन',
    all_organizations: 'सभी संगठन',
    system_settings: 'सिस्टम सेटिंग्स',
    super_admin: 'सुपर एडमिन',
    user_management: 'उपयोगकर्ता प्रबंधन',
    activate: 'सक्रिय करें',
    deactivate: 'निष्क्रिय करें',
    user_status: 'उपयोगकर्ता स्थिति',
    plan_type: 'योजना प्रकार',
    organization_name: 'संगठन का नाम',
    created_at: 'बनाया गया',
    updated_at: 'अपडेट किया गया',
    last_login: 'अंतिम लॉगिन',

    // Invoices & Sales
    invoice_number: 'इनवॉइस नंबर',
    invoice_date: 'इनवॉइस तारीख',
    due_date: 'नियत तारीख',
    bill_to: 'बिल को',
    ship_to: 'शिप को',
    quantity: 'मात्रा',
    unit_price: 'यूनिट मूल्य',
    line_total: 'लाइन कुल',
    draft: 'ड्राफ्ट',
    sent: 'भेजा गया',
    paid: 'भुगतान किया',
    partial: 'आंशिक',
    overdue: 'अतिदेय',
    cancelled: 'रद्द',
    mark_as_paid: 'भुगतान किया चिह्नित',
    mark_as_sent: 'भेजा गया चिह्नित',
    cancel_invoice: 'इनवॉइस रद्द करें',
    new_invoice: 'नया इनवॉइस',
    sales_return: 'बिक्री वापसी',

    // Purchases
    purchase_bill: 'खरीद बिल',
    supplier: 'आपूर्तिकर्ता',
    customer: 'ग्राहक',
    bill_number: 'बिल नंबर',
    bill_date: 'बिल तारीख',
    purchase_return: 'खरीद वापसी',
    new_purchase: 'नई खरीद',
    received: 'प्राप्त',

    // Inventory
    product: 'उत्पाद',
    products: 'उत्पाद',
    warehouse: 'गोदाम',
    stock: 'स्टॉक',
    stock_in: 'स्टॉक इन',
    stock_out: 'स्टॉक आउट',
    stock_adjustment: 'स्टॉक समायोजन',
    low_stock: 'कम स्टॉक',
    out_of_stock: 'स्टॉक खत्म',
    in_stock: 'स्टॉक में',
    sku: 'SKU',
    unit: 'यूनिट',
    category: 'श्रेणी',
    brand: 'ब्रांड',
    selling_price: 'बिक्री मूल्य',
    cost_price: 'लागत मूल्य',
    min_stock: 'न्यूनतम स्टॉक',
    max_stock: 'अधिकतम स्टॉक',
    batch_number: 'बैच नंबर',
    expiry_date: 'समाप्ति तारीख',

    // Parties
    party: 'पार्टी',
    customer_label: 'ग्राहक',
    supplier_label: 'आपूर्तिकर्ता',
    employee: 'कर्मचारी',
    both: 'दोनों',
    pan_number: 'पैन नंबर',
    credit_limit: 'क्रेडिट सीमा',
    contact_person: 'संपर्क व्यक्ति',
    province: 'प्रांत',
    city: 'शहर',
    address: 'पता',
    phone: 'फोन',
    bank_name: 'बैंक का नाम',
    bank_account: 'बैंक खाता',
    tds_applicable: 'टीडीएस लागू',
    ssf_applicable: 'SSF लागू',

    // Reports
    report_type: 'रिपोर्ट प्रकार',
    period: 'अवधि',
    from_date: 'से तारीख',
    to_date: 'तक तारीख',
    generate_report: 'रिपोर्ट बनाएं',
    financial_summary: 'वित्तीय सारांश',
    monthly_summary: 'मासिक सारांश',
    yearly_summary: 'वार्षिक सारांश',
    vat_report: 'वैट रिपोर्ट',
    tds_report: 'टीडीएस रिपोर्ट',

    // Fiscal Year
    fiscal_year: 'वित्तीय वर्ष',
    is_current: 'वर्तमान',
    is_locked: 'लॉक किया गया',
    lock_period: 'अवधि लॉक',

    // Settings
    preferences: 'प्राथमिकताएं',
    language: 'भाषा',
    theme: 'थीम',
    light: 'लाइट',
    dark: 'डार्क',
    system: 'सिस्टम',
    tax_configuration: 'कर विन्यास',
    vat_enabled: 'वैट सक्षम',
    tds_enabled: 'टीडीएस सक्षम',
    ssf_enabled: 'SSF सक्षम',
    default_warehouse: 'डिफ़ॉल्ट गोदाम',
    invoice_prefix: 'इनवॉइस उपसर्ग',
    bill_prefix: 'बिल उपसर्ग',
    journal_prefix: 'जर्नल उपसर्ग',
  },
}

/**
 * Get translations for a given locale
 */
export function getTranslations(locale: Locale = 'en'): TranslationStrings {
  return translations[locale] || translations.en
}

/**
 * Get a single translation value by key and locale
 */
export function t(key: keyof TranslationStrings, locale: Locale = 'en'): string {
  const trans = getTranslations(locale)
  return trans[key] || translations.en[key] || key
}

/**
 * Hook-like function for useTranslation
 * Returns an object with the `t` function bound to the given locale
 */
export function useTranslation(locale: Locale = 'en') {
  const trans = getTranslations(locale)

  return {
    t: (key: keyof TranslationStrings) => trans[key] || translations.en[key] || key,
    locale,
    translations: trans,
  }
}

/**
 * Get all available locales
 */
export function getLocales(): { code: Locale; name: string; nativeName: string }[] {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ne', name: 'Nepali', nativeName: 'नेपाली' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ]
}

export { translations }

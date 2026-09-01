import * as ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';
import { deepEdgeCases } from './generate-deep-edge-cases';

export type TestExecutionStatus = 'Not Run' | 'Run' | 'Hold' | 'Not Required' | 'Pass' | 'Fail' | 'Blocked';

export interface MasterTestCase {
  TC_ID: string;
  Module: string;
  Sub_Module: string;
  Test_Scenario: string;
  Test_Case_Title: string;
  Preconditions: string;
  Test_Data: string;
  Steps: string;
  Expected_Result: string;
  Priority: 'P0' | 'P1' | 'P2' | 'P3';
  Severity: 'Critical' | 'High' | 'Medium' | 'Low';
  Test_Type: 'Functional' | 'Negative' | 'Boundary' | 'UI' | 'Security' | 'Regression' | 'Performance' | 'Compatibility';
  User_Role: 'Customer' | 'Vendor' | 'Driver' | 'Sub-Admin' | 'Super Admin' | 'Guest / Unauthenticated';
  Browser: string;
  Environment: string;
  Regression: 'Yes' | 'No';
  Status: TestExecutionStatus;
  Actual_Result: string;
  Bug_ID: string;
  Comments: string;
}

const baseTestCases: MasterTestCase[] = [
  // ==========================================
  // 1. AUTHENTICATION & RBAC (AUTH)
  // ==========================================
  {
    TC_ID: 'AUTH-TC-001',
    Module: 'Authentication',
    Sub_Module: 'Customer Phone OTP Login',
    Test_Scenario: 'Successful login with valid 10-digit Indian phone number and valid OTP',
    Test_Case_Title: 'Verify customer can log in via Firebase Phone OTP and sync profile with backend',
    Preconditions: 'Customer App is installed; Backend running; Firebase Auth configured',
    Test_Data: 'Phone: +919876543210, OTP: 123456 (or dynamic SMS OTP)',
    Steps: '1. Launch Rasikae Flutter Customer App\n2. Enter valid phone number "+91 9876543210"\n3. Click "Send OTP"\n4. Enter received OTP "123456"\n5. Click "Verify & Proceed"',
    Expected_Result: 'User is authenticated via Firebase Auth; backend /users/sync creates or retrieves MongoDB user record; JWT token saved in secure storage; user lands on Home Feed screen.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Core entry point for all customer orders'
  },
  {
    TC_ID: 'AUTH-TC-002',
    Module: 'Authentication',
    Sub_Module: 'Customer OTP Validation - Invalid OTP',
    Test_Scenario: 'Attempt login with incorrect 6-digit OTP',
    Test_Case_Title: 'Verify appropriate error message on invalid OTP entry',
    Preconditions: 'OTP sent to customer phone number',
    Test_Data: 'Phone: +919876543210, Invalid OTP: 000000',
    Steps: '1. Enter valid phone number\n2. On OTP screen, enter "000000"\n3. Click "Verify & Proceed"',
    Expected_Result: 'App displays error message "Invalid OTP. Please check and try again"; input fields highlighted in red; user remains on OTP screen without token generation.',
    Priority: 'P1',
    Severity: 'High',
    Test_Type: 'Negative',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Security check against brute-force OTP'
  },
  {
    TC_ID: 'AUTH-TC-003',
    Module: 'Authentication',
    Sub_Module: 'Customer Phone Format Boundary Validation',
    Test_Scenario: 'Phone number field validation (empty, < 10 digits, > 10 digits, alphabetic characters)',
    Test_Case_Title: 'Verify phone number input field rejects invalid length and characters',
    Preconditions: 'Customer App Login screen open',
    Test_Data: 'Inputs: "", "98765", "987654321000", "98765ABCDE", "+9198765@#$%"',
    Steps: '1. Enter each test data string in Phone Number field\n2. Observe "Send OTP" button state and validation text',
    Expected_Result: '"Send OTP" button remains disabled or validation error "Enter a valid 10-digit mobile number" is shown; special characters and letters are blocked from entry.',
    Priority: 'P1',
    Severity: 'Medium',
    Test_Type: 'Boundary',
    User_Role: 'Guest / Unauthenticated',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Input sanitization'
  },
  {
    TC_ID: 'AUTH-TC-004',
    Module: 'Authentication',
    Sub_Module: 'Vendor Panel Email/Password Login',
    Test_Scenario: 'Vendor logs in with valid email and password credentials',
    Test_Case_Title: 'Verify approved vendor can access Vendor Dashboard',
    Preconditions: 'Vendor account approved by Admin in DB',
    Test_Data: 'Email: vendor@rasikae.com, Password: Password@123',
    Steps: '1. Open Vendor Web Panel URL\n2. Enter email "vendor@rasikae.com"\n3. Enter password "Password@123"\n4. Click "Sign In"',
    Expected_Result: 'Vendor is authenticated; backend verifies "vendor" role; JWT token saved in session; redirects to Vendor Live Orders Dashboard.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari / Firefox',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Core vendor entry point'
  },
  {
    TC_ID: 'AUTH-TC-005',
    Module: 'Authentication',
    Sub_Module: 'Driver App Login & Phone Check',
    Test_Scenario: 'Driver logs in with registered mobile number and checks onboarding status',
    Test_Case_Title: 'Verify registered driver login and active status check via /drivers/check-phone',
    Preconditions: 'Driver profile approved by Admin',
    Test_Data: 'Phone: +919811122233',
    Steps: '1. Launch Delivery Driver App\n2. Enter driver registered phone\n3. Verify OTP\n4. App triggers GET /drivers/check-phone',
    Expected_Result: 'Backend confirms driver status as ACTIVE; Driver Duty toggle (Online/Offline) screen is displayed.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Fleet readiness'
  },
  {
    TC_ID: 'AUTH-TC-006',
    Module: 'Authentication',
    Sub_Module: 'Super Admin Login & Session',
    Test_Scenario: 'Super Admin login with high privilege credentials',
    Test_Case_Title: 'Verify Super Admin access to Admin Panel with full panel permissions',
    Preconditions: 'Super Admin user in MongoDB with role "admin"',
    Test_Data: 'Email: admin@rasikae.com, Password: AdminSecurePass#2026',
    Steps: '1. Open Admin Panel URL\n2. Enter credentials\n3. Click "Login to Admin Console"',
    Expected_Result: 'Admin authenticated; full sidebar rendered (Analytics, Zones, Restaurants, Fleet, Settlements, Settings); live stats load.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Edge / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Super Admin full access'
  },
  {
    TC_ID: 'AUTH-TC-007',
    Module: 'Authentication',
    Sub_Module: 'Sub-Admin Role & Permission Isolation',
    Test_Scenario: 'Sub-Admin logs in and accesses only assigned panels (e.g. Orders & Fleet only)',
    Test_Case_Title: 'Verify Sub-Admin cannot access restricted panels (e.g. Finance & Settings)',
    Preconditions: 'Sub-Admin created with permissions: ["orders", "drivers"]',
    Test_Data: 'Email: zone_manager@rasikae.com, Password: ManagerPass@123',
    Steps: '1. Login as Sub-Admin\n2. Verify sidebar only shows Orders and Fleet\n3. Manually type direct URL "/finance" and "/settings" in browser bar',
    Expected_Result: 'Sidebar hides restricted panels; direct URL access is blocked with 403 Forbidden / redirects to unauthorized page.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Security',
    User_Role: 'Sub-Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'RBAC Enforcement test'
  },
  {
    TC_ID: 'AUTH-TC-008',
    Module: 'Authentication',
    Sub_Module: 'Direct URL Access Without Login',
    Test_Scenario: 'Attempt direct URL navigation to protected routes while logged out',
    Test_Case_Title: 'Verify unauthenticated users are redirected to login on accessing protected routes',
    Preconditions: 'Browser in incognito with cleared cookies/storage',
    Test_Data: 'URLs: "/admin/analytics", "/vendor/orders", "/orders/my-orders"',
    Steps: '1. Paste protected URL into browser address bar\n2. Press Enter',
    Expected_Result: 'Auth Guard intercepts request; user is redirected to Login screen; no sensitive dashboard data is leaked.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Security',
    User_Role: 'Guest / Unauthenticated',
    Browser: 'All Browsers',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Auth Guard verification'
  },
  {
    TC_ID: 'AUTH-TC-009',
    Module: 'Authentication',
    Sub_Module: 'Logout & Session Destruction',
    Test_Scenario: 'User clicks Logout and attempts browser Back button navigation',
    Test_Case_Title: 'Verify complete session clearance on logout and Back button protection',
    Preconditions: 'User is logged in on web/app',
    Test_Data: 'N/A',
    Steps: '1. Click "Logout"\n2. Confirm logout dialog\n3. Click browser "Back" button',
    Expected_Result: 'Tokens and cached user data cleared from storage; browser back button does not render authenticated screens or cached orders.',
    Priority: 'P1',
    Severity: 'High',
    Test_Type: 'Security',
    User_Role: 'Customer',
    Browser: 'All Browsers / Mobile',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Session handling'
  },

  // ==========================================
  // 2. CUSTOMER APP - DISCOVERY, MENU, CART (CUST)
  // ==========================================
  {
    TC_ID: 'CUST-TC-001',
    Module: 'Customer App',
    Sub_Module: 'Address Management - GPS Pinning & Default Selection',
    Test_Scenario: 'Add new delivery address using Map picker, flat/house details, and mark as default',
    Test_Case_Title: 'Verify adding address with lat/lng coordinates and auto-setting as default delivery address',
    Preconditions: 'Customer logged in',
    Test_Data: 'Label: "Office", Street: "Cyber City Tower B, 4th Floor", Lat: 28.4595, Lng: 77.0266, isDefault: true',
    Steps: '1. Open "Manage Addresses"\n2. Click "Add New Address"\n3. Move GPS map pin to location\n4. Fill Flat/Floor/Landmark\n5. Select tag "Work/Office"\n6. Check "Set as Default"\n7. Save',
    Expected_Result: 'Address saved in DB via POST /addresses; listed with "Default" badge; automatically selected during checkout.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Geospatial prerequisite for delivery zone matching'
  },
  {
    TC_ID: 'CUST-TC-002',
    Module: 'Customer App',
    Sub_Module: 'Home Feed Delivery Zone Filtering',
    Test_Scenario: 'Verify home feed lists only restaurants located within or delivering to the customer active zone',
    Test_Case_Title: 'Verify dynamic Home Feed loading based on selected address GPS lat/lng',
    Preconditions: 'Address selected with lat: 28.6139, lng: 77.2090',
    Test_Data: 'Endpoint: GET /restaurants/home-feed?lat=28.6139&lng=77.2090',
    Steps: '1. Open Home Feed\n2. Observe Promotional Banners carousel\n3. Observe Categories & Cuisines\n4. Observe Restaurant cards list',
    Expected_Result: 'Returns open/active restaurants delivering to user polygon zone; shows distance in km, delivery time (e.g. 25-30 mins), and average rating.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Core customer discovery screen'
  },
  {
    TC_ID: 'CUST-TC-003',
    Module: 'Customer App',
    Sub_Module: 'Search, Live Filters & Sorting',
    Test_Scenario: 'Search dish name with multiple filter combinations (Pure Veg, Rating 4+, Price low-to-high)',
    Test_Case_Title: 'Verify search returns matching dishes and restaurants with multi-filter refinement',
    Preconditions: 'Restaurants with Veg & Non-veg items in DB',
    Test_Data: 'Query: "Pizza", isVeg: true, minRating: 4.0, sort: "price_asc"',
    Steps: '1. Tap Search bar\n2. Type "Pizza"\n3. Toggle "Pure Veg"\n4. Tap Filter "Rating 4.0+"\n5. Tap Sort "Cost: Low to High"',
    Expected_Result: 'Only Pure Veg pizzas with 4.0+ ratings are displayed, ordered in ascending price; no non-veg items shown.',
    Priority: 'P1',
    Severity: 'Medium',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Search & filter integrity'
  },
  {
    TC_ID: 'CUST-TC-004',
    Module: 'Customer App',
    Sub_Module: 'Restaurant Menu & Customization Add-ons',
    Test_Scenario: 'Open restaurant menu, browse grouped categories, and select item variants/add-ons',
    Test_Case_Title: 'Verify grouped menu catalog display and dish variant/add-on price calculation',
    Preconditions: 'Restaurant is open and has dishes with variants',
    Test_Data: 'Dish: "Burger Combo" (Base ₹150) + "Extra Cheese" (+₹30) + "Large Fries" (+₹60)',
    Steps: '1. Select restaurant "The Burger Hub"\n2. Tap "+" on "Burger Combo"\n3. Customization modal pops up\n4. Select "Extra Cheese" and "Large Fries"\n5. Click "Add to Cart (₹240)"',
    Expected_Result: 'Total item price computes accurately to ₹240; item with selected add-on details appears in bottom floating cart bar.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Menu customization calculations'
  },
  {
    TC_ID: 'CUST-TC-005',
    Module: 'Customer App',
    Sub_Module: 'Multi-Cart Single vs Multi-Restaurant Handling',
    Test_Scenario: 'Add items from Restaurant A, then attempt adding item from Restaurant B',
    Test_Case_Title: 'Verify clear-cart warning popup when adding items from a different restaurant',
    Preconditions: 'Cart has 2 items from "Restaurant A"',
    Test_Data: 'Restaurant A: 2 items; Restaurant B: 1 item',
    Steps: '1. Add 2 items from "Restaurant A"\n2. Navigate back to Home\n3. Open "Restaurant B"\n4. Tap "+" on any item from Restaurant B',
    Expected_Result: 'Dialog displays: "Replace cart items? Your cart contains items from Restaurant A. Do you want to discard and add from Restaurant B?" with "Discard & Add" and "Cancel" buttons.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Cart conflict prevention rule'
  },
  {
    TC_ID: 'CUST-TC-006',
    Module: 'Customer App',
    Sub_Module: 'Cart Quantity Modification & Minimum Order Validation',
    Test_Scenario: 'Increment/decrement item count in cart and verify Minimum Order Value restriction',
    Test_Case_Title: 'Verify cart quantity updates in real-time and enforces minOrderValue threshold',
    Preconditions: 'System settings minOrderValue = ₹150; Items in cart',
    Test_Data: 'Item A (₹80): Qty 1 -> Total ₹80 (< ₹150); Increment to Qty 2 -> Total ₹160 (>= ₹150)',
    Steps: '1. Open Cart screen with 1 item of ₹80\n2. Observe "Proceed to Checkout" button state\n3. Tap "+" icon to increase qty to 2\n4. Observe button state',
    Expected_Result: 'At ₹80, button is disabled with warning "Add ₹70 more to place order"; at ₹160, button turns active and enabled.',
    Priority: 'P1',
    Severity: 'Medium',
    Test_Type: 'Boundary',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Min order threshold'
  },
  {
    TC_ID: 'CUST-TC-007',
    Module: 'Customer App',
    Sub_Module: 'Coupon Validation & Discount Calculation',
    Test_Scenario: 'Apply valid promo code "FIRST50" (50% OFF up to ₹100, min order ₹200)',
    Test_Case_Title: 'Verify promo code discount subtraction from subtotal and maxDiscount cap',
    Preconditions: 'Cart subtotal = ₹350; Promo code active in DB',
    Test_Data: 'Coupon: "FIRST50", Subtotal: ₹350, 50% = ₹175 -> Capped at ₹100',
    Steps: '1. On Cart screen, tap "Apply Coupon"\n2. Enter "FIRST50"\n3. Tap "Apply"',
    Expected_Result: 'API POST /promotions/validate succeeds; green banner "₹100 saved with FIRST50"; Bill breakdown shows: Subtotal ₹350, Discount -₹100, Delivery ₹40, Tax ₹12.50, To Pay ₹302.50.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Financial calculation'
  },
  {
    TC_ID: 'CUST-TC-008',
    Module: 'Customer App',
    Sub_Module: 'Invalid / Expired Coupon Handling',
    Test_Scenario: 'Apply non-existent or expired promo code',
    Test_Case_Title: 'Verify error message when applying invalid or expired coupon code',
    Preconditions: 'Cart open',
    Test_Data: 'Coupon: "EXPIRED99" or "FAKECODE"',
    Steps: '1. Enter "FAKECODE" in coupon field\n2. Click "Apply"',
    Expected_Result: 'Error message "Invalid or expired coupon code" displayed; no discount applied to bill.',
    Priority: 'P2',
    Severity: 'Low',
    Test_Type: 'Negative',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Promo error handling'
  },

  // ==========================================
  // 3. CHECKOUT, PAYMENTS & ORDER LIFECYCLE (ORD & PAY)
  // ==========================================
  {
    TC_ID: 'ORD-TC-001',
    Module: 'Orders & Checkout',
    Sub_Module: 'Cash on Delivery (COD) Checkout',
    Test_Scenario: 'Place order using Cash on Delivery payment method',
    Test_Case_Title: 'Verify complete COD order placement and immediate redirection to Live Tracking',
    Preconditions: 'Customer has items in cart and selected address',
    Test_Data: 'Payment Method: "COD", Delivery Note: "Call upon arrival"',
    Steps: '1. On Cart screen, select Address\n2. Select payment method "Cash on Delivery"\n3. Click "Place Order (COD)"',
    Expected_Result: 'Order created with status "PENDING"; cart cleared; order confirmation sound plays; redirected to Live Order Tracking screen showing Order #ID and estimated delivery time.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Primary COD order placement flow'
  },
  {
    TC_ID: 'ORD-TC-002',
    Module: 'Orders & Checkout',
    Sub_Module: 'Razorpay Online Payment - Successful Transaction',
    Test_Scenario: 'Initiate Razorpay checkout session, complete test payment via UPI/Card, and verify signature',
    Test_Case_Title: 'Verify end-to-end Razorpay online payment verification and order confirmation',
    Preconditions: 'Razorpay Test keys configured in backend .env',
    Test_Data: 'Payment Method: "ONLINE", Test UPI: success@razorpay',
    Steps: '1. Select "Online Payment (UPI/Cards/NetBanking)"\n2. Tap "Pay ₹350"\n3. Razorpay SDK modal opens with order_id\n4. Complete payment using success test UPI\n5. App receives paymentId & signature\n6. Calls POST /orders/confirm-payment',
    Expected_Result: 'Backend HMAC crypto verification passes; PaymentTransaction status updated to SUCCESS; Order status becomes "CONFIRMED"; Vendor receives live order alert.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Critical payment pathway'
  },
  {
    TC_ID: 'ORD-TC-003',
    Module: 'Orders & Checkout',
    Sub_Module: 'Razorpay Payment Failure / User Cancelation',
    Test_Scenario: 'User closes Razorpay payment modal or payment fails at bank gateway',
    Test_Case_Title: 'Verify handling of failed/cancelled payment session without creating orphan orders',
    Preconditions: 'Razorpay modal open',
    Test_Data: 'Action: Tap "X" close button or trigger failed payment simulator',
    Steps: '1. Tap "Pay Online"\n2. When Razorpay modal loads, click close "X"\n3. Confirm cancel payment',
    Expected_Result: 'App shows message "Payment was cancelled. You can retry or choose Cash on Delivery"; cart items remain intact; no unpaid order created in DB.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Negative',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Payment drop-off resilience'
  },
  {
    TC_ID: 'ORD-TC-004',
    Module: 'Orders & Checkout',
    Sub_Module: 'Idempotency Duplicate Click Prevention',
    Test_Scenario: 'Rapidly double-tap or triple-tap "Place Order" button on slow 2G/3G network',
    Test_Case_Title: 'Verify client idempotencyKey prevents duplicate orders and double billing',
    Preconditions: 'Slow network simulation enabled (Throttling: Slow 3G)',
    Test_Data: '5 rapid clicks on "Place Order"',
    Steps: '1. Go to checkout\n2. Rapidly tap "Place Order" button 5 times within 1 second',
    Expected_Result: 'Button enters loading/disabled state on first tap; backend uses unique idempotencyKey to return the same single order; user is NOT charged multiple times.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Security',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Idempotency & concurrency test'
  },
  {
    TC_ID: 'ORD-TC-005',
    Module: 'Orders & Checkout',
    Sub_Module: 'Live Order Real-time WebSocket Status Progression',
    Test_Scenario: 'Customer observes live order tracking screen as vendor & driver progress the order',
    Test_Case_Title: 'Verify real-time status updates (PLACED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED) via WebSockets',
    Preconditions: 'Customer has order tracking screen open',
    Test_Data: 'Order #ORD-9901',
    Steps: '1. Keep Customer Live Tracking screen open\n2. Vendor accepts order & marks PREPARING\n3. Driver picks up order & marks OUT_FOR_DELIVERY\n4. Driver marks DELIVERED',
    Expected_Result: 'Status stepper on customer screen updates automatically in real-time with smooth animation and sound without needing pull-to-refresh.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Real-time Socket.IO validation'
  },
  {
    TC_ID: 'ORD-TC-006',
    Module: 'Orders & Checkout',
    Sub_Module: 'Live Driver GPS Tracking on Google Maps',
    Test_Scenario: 'Driver travels on road; customer watches real-time bike marker movement and dynamic ETA',
    Test_Case_Title: 'Verify real-time driver GPS marker movement and ETA recalculation on map',
    Preconditions: 'Order is in "OUT_FOR_DELIVERY" status',
    Test_Data: 'Driver emits GPS: Lat 28.6140 -> 28.6150 -> 28.6160 every 5 seconds',
    Steps: '1. Open Live Map on Customer App\n2. Driver app sends continuous location stream',
    Expected_Result: 'Delivery partner bike icon rotates towards bearing and smoothly moves across road on map; ETA counter updates dynamically (e.g. "Arriving in 8 mins").',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Live GPS map experience'
  },
  {
    TC_ID: 'ORD-TC-007',
    Module: 'Orders & Checkout',
    Sub_Module: 'PDF Invoice Generation & Download',
    Test_Scenario: 'Download official PDF tax invoice for completed order',
    Test_Case_Title: 'Verify PDFKit invoice generation with restaurant details, tax breakdown, and items',
    Preconditions: 'Order status is "DELIVERED"',
    Test_Data: 'Endpoint: GET /orders/:id/invoice',
    Steps: '1. Go to "My Orders"\n2. Select completed order\n3. Tap "Download Invoice"',
    Expected_Result: 'PDF file is generated on backend and downloaded to mobile storage; contains Order ID, Date, Restaurant Name, GST/Tax, Itemized Pricing, and Payment Method.',
    Priority: 'P1',
    Severity: 'Medium',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile / Web',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Invoice generation'
  },
  {
    TC_ID: 'ORD-TC-008',
    Module: 'Orders & Checkout',
    Sub_Module: 'Customer Ratings & Review Submission',
    Test_Scenario: 'Submit 1-5 star ratings and reviews for restaurant and driver after delivery',
    Test_Case_Title: 'Verify review submission and automatic recalculation of restaurant average rating',
    Preconditions: 'Order status is "DELIVERED"',
    Test_Data: 'Food Rating: 5, Driver Rating: 5, Comment: "Hot food, super fast delivery!"',
    Steps: '1. Open delivered order\n2. Tap "Rate Order"\n3. Select 5 stars\n4. Type feedback\n5. Submit',
    Expected_Result: 'Review saved in DB via POST /reviews; restaurant rating counter increments; review visible under restaurant public profile.',
    Priority: 'P1',
    Severity: 'Low',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Reviews module'
  },

  // ==========================================
  // 4. VENDOR WEB PANEL (VEND)
  // ==========================================
  {
    TC_ID: 'VEND-TC-001',
    Module: 'Vendor Panel',
    Sub_Module: 'Live Order Incoming Audio Alert & Modal',
    Test_Scenario: 'Customer places order; Vendor dashboard triggers continuous audio chime and popup',
    Test_Case_Title: 'Verify continuous audio ringing and popup modal on receiving new order in Vendor Panel',
    Preconditions: 'Vendor logged into Web Dashboard on browser',
    Test_Data: 'New order placed by customer',
    Steps: '1. Keep Vendor Dashboard open in tab\n2. Customer places new order\n3. Observe Vendor screen and sound',
    Expected_Result: 'Continuous high-priority ringing chime plays; modal displays customer name, item breakdown, delivery address, with "Accept (Prep Time)" and "Reject" buttons.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari / Firefox',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Core kitchen alert system'
  },
  {
    TC_ID: 'VEND-TC-002',
    Module: 'Vendor Panel',
    Sub_Module: 'Order Acceptance with Preparation Time',
    Test_Scenario: 'Vendor accepts order and selects preparation duration (e.g. 20 mins)',
    Test_Case_Title: 'Verify order status changes to "PREPARING" and sets estimated prep time',
    Preconditions: 'New incoming order modal active',
    Test_Data: 'Prep Time: 20 minutes',
    Steps: '1. Select "20 mins"\n2. Click "Accept Order"',
    Expected_Result: 'Audio alert stops; order moves to "Preparing" column with countdown timer; status updated to PREPARING in DB; customer and backend dispatch service notified.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Vendor order acceptance'
  },
  {
    TC_ID: 'VEND-TC-003',
    Module: 'Vendor Panel',
    Sub_Module: 'Order Rejection & Cancellation Reason',
    Test_Scenario: 'Vendor rejects incoming order with reason (e.g. "Kitchen Overloaded / Out of Stock")',
    Test_Case_Title: 'Verify order rejection updates status to CANCELLED and initiates auto-refund for online orders',
    Preconditions: 'New incoming order modal active',
    Test_Data: 'Reason: "Items out of stock"',
    Steps: '1. Click "Reject Order"\n2. Select reason "Items out of stock"\n3. Confirm rejection',
    Expected_Result: 'Order status updated to "CANCELLED"; Customer notified with cancellation reason; if prepaid, refund record triggered.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Rejection handling'
  },
  {
    TC_ID: 'VEND-TC-004',
    Module: 'Vendor Panel',
    Sub_Module: 'Mark Order "Ready for Pickup"',
    Test_Scenario: 'Food preparation completed; vendor clicks "Ready for Pickup / Food Prepared"',
    Test_Case_Title: 'Verify order transitions to READY_FOR_PICKUP and signals assigned delivery driver',
    Preconditions: 'Order in "PREPARING" status',
    Test_Data: 'Order #ORD-1002',
    Steps: '1. Locate order under "Preparing" list\n2. Click button "Ready for Pickup"',
    Expected_Result: 'Status becomes "READY_FOR_PICKUP"; Driver app displays "Food is ready for collection"; Customer tracking shows "Food prepared".',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Kitchen handoff'
  },
  {
    TC_ID: 'VEND-TC-005',
    Module: 'Vendor Panel',
    Sub_Module: 'Menu Item CRUD & S3 Photo Upload',
    Test_Scenario: 'Add new dish with title, description, price, food category, veg/non-veg, and photo upload',
    Test_Case_Title: 'Verify adding new menu item with S3 image upload and immediate reflection on customer app',
    Preconditions: 'Vendor logged in',
    Test_Data: 'Name: "Kadhai Paneer Special", Price: ₹290, Category: "Main Course", Image: "paneer.jpg"',
    Steps: '1. Go to "Menu Management"\n2. Click "Add Item"\n3. Upload photo (JPG/PNG)\n4. Fill dish name, price ₹290, select "Pure Veg"\n5. Click "Save Item"',
    Expected_Result: 'Photo uploaded to AWS S3 bucket; item saved in MongoDB via POST /menu-items; dish immediately searchable and orderable on Customer App.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Menu management'
  },
  {
    TC_ID: 'VEND-TC-006',
    Module: 'Vendor Panel',
    Sub_Module: 'Real-time Item Stock Availability Toggle',
    Test_Scenario: 'Toggle dish switch to "Out of Stock" during rush hours',
    Test_Case_Title: 'Verify dish instant availability toggle blocks customer ordering in real-time',
    Preconditions: 'Dish currently available',
    Test_Data: 'Dish: "Butter Naan"',
    Steps: '1. Find "Butter Naan" in menu table\n2. Toggle availability switch to OFF',
    Expected_Result: 'Backend updates isAvailable: false; Customer App displays dish with "Out of Stock" disabled button in real-time.',
    Priority: 'P1',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Stock control'
  },
  {
    TC_ID: 'VEND-TC-007',
    Module: 'Vendor Panel',
    Sub_Module: 'Store Open / Closed Master Duty Switch',
    Test_Scenario: 'Toggle restaurant master switch to "Closed / Not Accepting Orders"',
    Test_Case_Title: 'Verify restaurant closure switch prevents new orders across all customer apps',
    Preconditions: 'Restaurant currently open',
    Test_Data: 'Toggle isOpen: false',
    Steps: '1. Tap master "Open/Close" switch in header\n2. Confirm closure modal',
    Expected_Result: 'Restaurant card on Customer App displays "Currently Closed - Opens at 10 AM"; cart checkout disabled for this restaurant.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Store operational toggle'
  },
  {
    TC_ID: 'VEND-TC-008',
    Module: 'Vendor Panel',
    Sub_Module: 'Vendor Earnings Wallet & Payout Withdrawal Request',
    Test_Scenario: 'Check total order revenue, deducted platform commission (15%), and submit withdrawal request',
    Test_Case_Title: 'Verify vendor wallet ledger calculations and payout withdrawal creation',
    Preconditions: 'Vendor wallet has available balance >= ₹1,000',
    Test_Data: 'Withdrawal Amount: ₹5,000',
    Steps: '1. Go to "Wallet & Payouts"\n2. Verify Net Balance = Gross Sales - 15% Platform Commission\n3. Click "Request Payout"\n4. Enter amount ₹5,000\n5. Submit',
    Expected_Result: 'Payout request created with status "PENDING" in DB via POST /wallets/restaurant/:id/withdraw; balance locked; visible in Admin Panel for batch settlement.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Vendor',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Vendor financial settlements'
  },

  // ==========================================
  // 5. DELIVERY DRIVER APP (DRIV)
  // ==========================================
  {
    TC_ID: 'DRIV-TC-001',
    Module: 'Driver App',
    Sub_Module: 'Go Online / Offline Duty Switch & Zone Detection',
    Test_Scenario: 'Driver slides "Go Online" toggle and GPS detects current delivery zone',
    Test_Case_Title: 'Verify driver online status update and zone registration via /drivers/:id/status',
    Preconditions: 'Driver logged in with GPS permissions granted',
    Test_Data: 'Status: isOnline = true, isAvailable = true',
    Steps: '1. Launch Driver App\n2. Slide "Go Online" toggle to Right\n3. Observe header indicator',
    Expected_Result: 'Header shows green badge "ONLINE - Searching for deliveries"; Driver coordinates posted to Redis/Backend; Driver pin appears on Admin live fleet map.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Driver availability'
  },
  {
    TC_ID: 'DRIV-TC-002',
    Module: 'Driver App',
    Sub_Module: 'Incoming Delivery Dispatch Modal with 30s Timer',
    Test_Scenario: 'Auto-dispatch algorithm assigns order to nearest online driver',
    Test_Case_Title: 'Verify incoming delivery request popup with pickup/drop locations, earnings, and countdown timer',
    Preconditions: 'Driver is Online in Zone; New order ready for pickup',
    Test_Data: 'Delivery Request: Pickup "The Burger Hub", Drop "Sector 14", Earning "₹45"',
    Steps: '1. Backend auto-dispatches order\n2. Observe Driver App screen',
    Expected_Result: 'Loud alert chime rings; modal pops up showing Pickup Restaurant, Distance (1.8 km), Drop Location (3.2 km), Estimated Earning ₹45, and 30-second countdown timer.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Dispatch workflow'
  },
  {
    TC_ID: 'DRIV-TC-003',
    Module: 'Driver App',
    Sub_Module: 'Accept Delivery & Restaurant Navigation',
    Test_Scenario: 'Driver taps "Accept Order" and launches Google Maps navigation to restaurant',
    Test_Case_Title: 'Verify driver acceptance locks order and opens in-app navigation to pickup location',
    Preconditions: 'Delivery request modal active',
    Test_Data: 'Order #ORD-1002',
    Steps: '1. Tap "Accept Delivery"\n2. Tap "Navigate to Restaurant"',
    Expected_Result: 'Order locked to driver; status becomes "DRIVER_ASSIGNED"; Google Maps turn-by-turn navigation opens to restaurant coordinates.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Driver pickup phase'
  },
  {
    TC_ID: 'DRIV-TC-004',
    Module: 'Driver App',
    Sub_Module: 'Arrived at Restaurant & Pickup Verification',
    Test_Scenario: 'Driver reaches restaurant, clicks "Arrived", verifies items, and marks "Picked Up"',
    Test_Case_Title: 'Verify order transition to OUT_FOR_DELIVERY upon pickup confirmation',
    Preconditions: 'Driver at restaurant location',
    Test_Data: 'Status: "DRIVER_ARRIVED_RESTAURANT" -> "OUT_FOR_DELIVERY"',
    Steps: '1. Click "Arrived at Restaurant"\n2. Match order item checklist with vendor\n3. Slide "Confirm Pickup & Start Delivery"',
    Expected_Result: 'Order status updates to "OUT_FOR_DELIVERY"; Customer receives notification "Driver has picked up your food"; In-app navigation switches to Customer Drop Address.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Pickup confirmation'
  },
  {
    TC_ID: 'DRIV-TC-005',
    Module: 'Driver App',
    Sub_Module: 'Background GPS Location Streaming',
    Test_Scenario: 'Driver navigates to customer with phone locked or app minimized in background',
    Test_Case_Title: 'Verify background GPS location transmission continues every 5-10s without interruption',
    Preconditions: 'Order in OUT_FOR_DELIVERY state',
    Test_Data: 'Background GPS service running',
    Steps: '1. Start driving towards customer\n2. Minimize Driver App (or lock screen)\n3. Check backend Redis/Socket coordinates received',
    Expected_Result: 'App background service sends coordinates to PATCH /drivers/:id/location; customer map marker continues to update smoothly without freezing.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Background location permission & socket resilience'
  },
  {
    TC_ID: 'DRIV-TC-006',
    Module: 'Driver App',
    Sub_Module: 'Cash on Delivery (COD) Collection & Complete Delivery',
    Test_Scenario: 'Driver reaches customer doorstep, collects cash (if COD), and completes delivery',
    Test_Case_Title: 'Verify COD cash collection confirmation and final order delivery completion',
    Preconditions: 'Driver at customer doorstep; Order is COD ₹350',
    Test_Data: 'Cash Collected: ₹350',
    Steps: '1. Tap "Arrived at Customer"\n2. For COD: Confirm "Collected ₹350 in Cash"\n3. Slide "Complete Delivery"',
    Expected_Result: 'Order marked "DELIVERED"; Delivery fee (e.g. ₹45) credited to Driver Wallet; COD cash ₹350 recorded in driver cash-in-hand ledger; customer receives delivery notification & rating prompt.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Final delivery completion & ledger update'
  },
  {
    TC_ID: 'DRIV-TC-007',
    Module: 'Driver App',
    Sub_Module: 'Driver Wallet, Daily Trips & Payout History',
    Test_Scenario: 'Driver checks daily completed trips summary, total delivery earnings, tips, and payout balance',
    Test_Case_Title: 'Verify driver earnings dashboard matches completed deliveries and incentive calculations',
    Preconditions: 'Driver completed 5 deliveries today',
    Test_Data: '5 deliveries @ ₹45 = ₹225 + ₹50 incentive',
    Steps: '1. Open "Earnings & Wallet" tab\n2. Verify Today Trips = 5, Earnings = ₹275\n3. View transaction breakdown',
    Expected_Result: 'Displays itemized delivery fees, distance incentives, cash-in-hand balance, and net payout eligible amount accurately.',
    Priority: 'P1',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Driver',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Driver financial statement'
  },

  // ==========================================
  // 6. ADMIN WEB PANEL (ADMN)
  // ==========================================
  {
    TC_ID: 'ADMN-TC-001',
    Module: 'Admin Panel',
    Sub_Module: 'Global Real-time Analytics Dashboard',
    Test_Scenario: 'Super Admin views live platform KPIs: GMV, Active Orders, Online Fleet, Platform Commission',
    Test_Case_Title: 'Verify global analytics cards, revenue graphs, and date-range filters load accurately',
    Preconditions: 'Admin logged into Web Panel',
    Test_Data: 'Date Range: "Today", "Last 7 Days", "This Month"',
    Steps: '1. Open Admin Dashboard\n2. Select Date Filter "This Month"\n3. Verify Total Orders, GMV, Net Commission, Active Drivers stats',
    Expected_Result: 'Aggregates data via GET /analytics/global; displays accurate revenue graphs, order breakdown charts, and top-performing restaurants.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari / Edge',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Executive dashboard'
  },
  {
    TC_ID: 'ADMN-TC-002',
    Module: 'Admin Panel',
    Sub_Module: 'Geofencing Delivery Zones Polygon Drawing',
    Test_Scenario: 'Admin draws new polygon delivery zone on interactive map, names it, and assigns a Zone Manager',
    Test_Case_Title: 'Verify creating and saving GeoJSON polygon delivery boundaries on interactive map',
    Preconditions: 'Admin on "Zones Panel"',
    Test_Data: 'Zone Name: "Sector 62 IT Hub", Polygon: [[77.36, 28.62], [77.38, 28.62], [77.38, 28.60], [77.36, 28.60]]',
    Steps: '1. Go to "Zones"\n2. Click "Create New Zone"\n3. Click 4 points on map to draw polygon boundary\n4. Enter Name "Sector 62 IT Hub"\n5. Select Zone Manager from dropdown\n6. Click "Save Zone"',
    Expected_Result: 'Zone polygon saved via POST /zones; zone renders with colored boundary; used by backend geospatial query to match customers and drivers.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Geofencing core feature'
  },
  {
    TC_ID: 'ADMN-TC-003',
    Module: 'Admin Panel',
    Sub_Module: 'Restaurant Approval & Commission Rate Override',
    Test_Scenario: 'Admin reviews newly registered restaurant, sets custom commission (e.g. 18%), and activates store',
    Test_Case_Title: 'Verify restaurant document approval, commission setting, and instant store activation',
    Preconditions: 'New vendor registration in pending status',
    Test_Data: 'Commission: 18% (0.18), Status: Approved = true, Active = true',
    Steps: '1. Open "Restaurants Panel"\n2. Filter by "Pending Approval"\n3. Click "Review"\n4. Set Commission Percentage to 18%\n5. Click "Approve & Activate"',
    Expected_Result: 'Restaurant status updated via PATCH /restaurants/:id; restaurant becomes live and visible on Customer App with 18% commission rate applied to orders.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Vendor onboarding governance'
  },
  {
    TC_ID: 'ADMN-TC-004',
    Module: 'Admin Panel',
    Sub_Module: 'Live Fleet Map & Manual Driver Reassignment',
    Test_Scenario: 'Admin views real-time GPS locations of all online drivers and manually dispatches an unassigned order',
    Test_Case_Title: 'Verify live fleet visualization and manual driver assignment overriding auto-dispatch',
    Preconditions: 'Live orders and online drivers in system',
    Test_Data: 'Order #ORD-1005, Driver: "Vikas Singh"',
    Steps: '1. Open "Live Map / Fleet Panel"\n2. Observe live driver markers\n3. Select unassigned Order #ORD-1005\n4. Click "Manual Assign"\n5. Select driver "Vikas Singh"\n6. Click "Dispatch Order"',
    Expected_Result: 'Order assigned to Vikas Singh via PATCH /orders/:id/assign-driver; dispatch notification sent immediately to driver app.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Fleet emergency dispatch'
  },
  {
    TC_ID: 'ADMN-TC-005',
    Module: 'Admin Panel',
    Sub_Module: 'Financial Settlements, Audit & Batch Payouts',
    Test_Scenario: 'Admin reviews vendor withdrawal requests, verifies bank details, and executes batch settlement',
    Test_Case_Title: 'Verify batch payout approval and wallet transaction reconciliation in Admin Ledger',
    Preconditions: 'Vendor withdrawal requests in "PENDING" status',
    Test_Data: '3 pending requests totaling ₹18,500',
    Steps: '1. Open "Finance & Settlements Panel"\n2. Select 3 pending payout requests\n3. Click "Approve & Settle Batch"\n4. Enter admin confirmation password',
    Expected_Result: 'Backend processes settlement via POST /wallets/admin/settle-batch; status marked "COMPLETED"; transaction recorded in Admin Audit Ledger.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Financial governance'
  },
  {
    TC_ID: 'ADMN-TC-006',
    Module: 'Admin Panel',
    Sub_Module: 'Promotions & Coupon Campaign Creator',
    Test_Scenario: 'Create discount campaign "WEEKEND20" (20% OFF, min order ₹300, max discount ₹80, valid for 7 days)',
    Test_Case_Title: 'Verify creation of discount promo campaigns with usage limits and expiry dates',
    Preconditions: 'Admin on Promos Panel',
    Test_Data: 'Code: "WEEKEND20", DiscountType: "PERCENTAGE", Value: 20, MaxDiscount: 8000, MinOrder: 30000',
    Steps: '1. Go to "Promos & Coupons"\n2. Click "Create Campaign"\n3. Enter Code: "WEEKEND20"\n4. Set 20% discount, Max ₹80, Min Order ₹300\n5. Set Start & End dates\n6. Click "Publish Campaign"',
    Expected_Result: 'Coupon saved in DB via POST /promotions; immediately active and valid for customer cart checkout.',
    Priority: 'P1',
    Severity: 'Medium',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Marketing tools'
  },
  {
    TC_ID: 'ADMN-TC-007',
    Module: 'Admin Panel',
    Sub_Module: 'System Settings & Maintenance Mode Toggle',
    Test_Scenario: 'Admin updates global delivery base fee (₹40 -> ₹50), tax % (5%), and tests Maintenance Mode toggle',
    Test_Case_Title: 'Verify global configuration updates and maintenance mode banner activation',
    Preconditions: 'Admin on Settings Panel',
    Test_Data: 'deliveryBaseFee: 5000 (₹50), isMaintenanceMode: true',
    Steps: '1. Open "Admin Settings Panel"\n2. Update Delivery Base Fee = ₹50\n3. Toggle "Maintenance Mode" to ON with message "Upgrading servers"\n4. Save Settings',
    Expected_Result: 'Config updated via PATCH /settings; Customer apps show maintenance banner and block new checkouts until toggled back to OFF.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'System controls'
  },
  {
    TC_ID: 'ADMN-TC-008',
    Module: 'Admin Panel',
    Sub_Module: 'Broadcast Marketing Push Notifications via Firebase FCM',
    Test_Scenario: 'Send rich broadcast push notification to all customer app users with custom deep link',
    Test_Case_Title: 'Verify Firebase Cloud Messaging broadcast notification dispatch to all active customer devices',
    Preconditions: 'Customers registered with FCM tokens in DB',
    Test_Data: 'Title: "Sunday Biryani Fest!", Body: "Flat 40% OFF on all Biryani orders today!", DeepLink: "/category/biryani"',
    Steps: '1. Go to "Communications / Notifications"\n2. Select Target: "All Customers"\n3. Enter Title and Body\n4. Click "Send Broadcast Notification"',
    Expected_Result: 'Backend dispatches multicast message via Firebase Admin SDK; push notification received on customer mobile devices within 3-5 seconds.',
    Priority: 'P1',
    Severity: 'Medium',
    Test_Type: 'Functional',
    User_Role: 'Super Admin',
    Browser: 'Chrome / Safari',
    Environment: 'Staging / Prod',
    Regression: 'No',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'FCM push notifications'
  },

  // ==========================================
  // 7. SECURITY, GENERAL EDGE CASES & CONCURRENCY (SEC & EDGE)
  // ==========================================
  {
    TC_ID: 'SEC-TC-001',
    Module: 'Security & Integrity',
    Sub_Module: 'Insecure Direct Object References (IDOR) - Orders & Wallets',
    Test_Scenario: 'Customer A attempts to fetch or update Customer B order or vendor wallet by changing ID in API request',
    Test_Case_Title: 'Verify backend forbids cross-user access to orders, addresses, and wallets',
    Preconditions: 'Customer A logged in (userId: user_A); Order belongs to user_B',
    Test_Data: 'Request: GET /orders/:orderId_of_User_B with Token of User_A',
    Steps: '1. Log in as Customer A\n2. Attempt GET /orders/order_B_id\n3. Attempt GET /wallets/driver/driver_B_id',
    Expected_Result: 'Backend checks user ownership against currentUser._id; returns 403 Forbidden with message "You are not authorized to view this order/wallet"; zero data leakage.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Security',
    User_Role: 'Customer',
    Browser: 'All Browsers / Postman',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'IDOR Prevention'
  },
  {
    TC_ID: 'SEC-TC-002',
    Module: 'Security & Integrity',
    Sub_Module: 'Razorpay HMAC Cryptographic Signature Tampering',
    Test_Scenario: 'Attacker intercepts payment response and sends forged signature with modified amount or order ID',
    Test_Case_Title: 'Verify backend HMAC-SHA256 signature verification rejects tampered payment payloads',
    Preconditions: 'Online payment initiated',
    Test_Data: 'Payload with manipulated razorpaySignature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"',
    Steps: '1. Initiate payment session\n2. Send POST /orders/confirm-payment with fake signature string',
    Expected_Result: 'Backend crypto verification fails (crypto.createHmac(sha256).digest(hex) !== razorpaySignature); throws 400 BadRequestException "Invalid payment signature"; order NOT confirmed.',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Security',
    User_Role: 'Guest / Unauthenticated',
    Browser: 'Postman / API',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Payment security'
  },
  {
    TC_ID: 'SEC-TC-003',
    Module: 'Security & Integrity',
    Sub_Module: 'Malicious File Upload & MIME Type Validation',
    Test_Scenario: 'Attacker attempts uploading executable script (.php, .exe, .sh, .js) disguised as dish image',
    Test_Case_Title: 'Verify AWS S3 upload service restricts files strictly to valid image MIME types (JPG/PNG/WEBP) <= 5MB',
    Preconditions: 'Vendor/Admin logged in on upload screen',
    Test_Data: 'File: "exploit.php" renamed to "exploit.php.jpg" with executable payload',
    Steps: '1. Open Image Upload form\n2. Select fake script file\n3. Click Upload',
    Expected_Result: 'Multer & S3 validator checks file magic bytes and MIME type; rejects upload with 400 "Invalid file type. Only JPEG, PNG, and WEBP images allowed up to 5MB".',
    Priority: 'P0',
    Severity: 'Critical',
    Test_Type: 'Security',
    User_Role: 'Vendor',
    Browser: 'All Browsers',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'File upload security'
  },
  {
    TC_ID: 'EDGE-TC-001',
    Module: 'Edge Cases',
    Sub_Module: 'Zero Drivers Online in Zone During Order Checkout',
    Test_Scenario: 'Customer places order in a delivery zone when all active drivers are currently offline or busy',
    Test_Case_Title: 'Verify graceful handling and auto-retry queue when no drivers are available in zone',
    Preconditions: '0 drivers online in Zone A; Order placed at Restaurant in Zone A',
    Test_Data: 'Order #ORD-1099',
    Steps: '1. Place order in Zone A\n2. Auto-assign service executes finding nearest driver',
    Expected_Result: 'Order transitions to "READY_FOR_PICKUP" / "UNASSIGNED"; alerts Admin live fleet dashboard with "Needs Manual Dispatch" badge; retries auto-assignment when a driver goes online.',
    Priority: 'P1',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'All Platforms',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Fleet availability edge case'
  },
  {
    TC_ID: 'EDGE-TC-002',
    Module: 'Edge Cases',
    Sub_Module: 'Network Drop & Automatic WebSocket Reconnection',
    Test_Scenario: 'Mobile loses internet connection in elevator/tunnel during live delivery and regains signal',
    Test_Case_Title: 'Verify WebSocket automatic reconnection and state resynchronization on network restore',
    Preconditions: 'Active Live Tracking screen open on mobile',
    Test_Data: 'Airplane mode ON for 20 seconds, then OFF',
    Steps: '1. Open Live Order Tracking\n2. Toggle Airplane Mode ON\n3. Vendor/Driver updates status to OUT_FOR_DELIVERY\n4. Toggle Airplane Mode OFF',
    Expected_Result: 'Socket.IO client automatically triggers reconnection handshake with saved auth token; fetches latest order snapshot via GET /orders/:id fallback; tracking screen updates to latest state.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'Mobile (Android/iOS)',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Network resilience'
  },
  {
    TC_ID: 'EDGE-TC-003',
    Module: 'Edge Cases',
    Sub_Module: 'Item Sold Out Race Condition During Checkout',
    Test_Scenario: 'Item in customer cart is marked Out of Stock by restaurant owner seconds before customer taps Pay',
    Test_Case_Title: 'Verify database transaction aborts checkout if any cart item became unavailable',
    Preconditions: 'Customer has "Special Thali" in cart',
    Test_Data: 'Vendor marks "Special Thali" unavailable right before customer checkout',
    Steps: '1. Customer opens checkout screen\n2. Vendor toggles "Special Thali" to Out of Stock\n3. Customer clicks "Place Order"',
    Expected_Result: 'Database transaction detects item isAvailable: false; aborts order creation; returns 400 error "Special Thali is no longer available. Please update your cart."; customer not charged.',
    Priority: 'P0',
    Severity: 'High',
    Test_Type: 'Functional',
    User_Role: 'Customer',
    Browser: 'All Platforms',
    Environment: 'Staging / Prod',
    Regression: 'Yes',
    Status: 'Not Run',
    Actual_Result: '',
    Bug_ID: '',
    Comments: 'Race condition & stock concurrency'
  }
];

// COMBINE BASE + DEEP EDGE CASES
const allTestCases: MasterTestCase[] = [
  ...baseTestCases,
  ...deepEdgeCases
].map(tc => ({
  ...tc,
  Status: 'Not Run' as TestExecutionStatus
}));

async function generateEnterpriseExcelWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rasikae QA Automation Architect';
  workbook.lastModifiedBy = 'Rasikae QA Automation Architect';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ========================================================
  // SHEET 1: MASTER TEST CASES (WITH DROPDOWNS & RICH STYLING)
  // ========================================================
  const ws1 = workbook.addWorksheet('Sheet 1 — Test Cases', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  const columns = [
    { header: 'TC_ID', key: 'TC_ID', width: 16 },
    { header: 'Module', key: 'Module', width: 24 },
    { header: 'Sub_Module', key: 'Sub_Module', width: 30 },
    { header: 'Test_Scenario', key: 'Test_Scenario', width: 45 },
    { header: 'Test_Case_Title', key: 'Test_Case_Title', width: 45 },
    { header: 'Preconditions', key: 'Preconditions', width: 35 },
    { header: 'Test_Data', key: 'Test_Data', width: 35 },
    { header: 'Steps', key: 'Steps', width: 50 },
    { header: 'Expected_Result', key: 'Expected_Result', width: 50 },
    { header: 'Priority', key: 'Priority', width: 12 },
    { header: 'Severity', key: 'Severity', width: 14 },
    { header: 'Test_Type', key: 'Test_Type', width: 18 },
    { header: 'User_Role', key: 'User_Role', width: 22 },
    { header: 'Browser', key: 'Browser', width: 22 },
    { header: 'Environment', key: 'Environment', width: 18 },
    { header: 'Regression', key: 'Regression', width: 14 },
    { header: 'Status', key: 'Status', width: 18 },
    { header: 'Actual_Result', key: 'Actual_Result', width: 28 },
    { header: 'Bug_ID', key: 'Bug_ID', width: 16 },
    { header: 'Comments', key: 'Comments', width: 35 },
  ];

  ws1.columns = columns;

  // Add all test cases
  allTestCases.forEach((tc) => {
    ws1.addRow(tc);
  });

  // Style Header Row (Dark Slate / Navy #1E293B with White Bold text)
  const headerRow1 = ws1.getRow(1);
  headerRow1.height = 28;
  headerRow1.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Add Dropdown Data Validation and row styling for rows 2 to allTestCases.length + 1
  for (let i = 2; i <= allTestCases.length + 1; i++) {
    const row = ws1.getRow(i);
    row.height = 42;

    // Apply borders and word-wrap to all cells in the row
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      cell.font = { name: 'Calibri', size: 10 };
    });

    // Column Q (17) is Status -> Add Dropdown for: Not Run, Run, Hold, Not Required
    const statusCell = row.getCell('Status');
    statusCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Not Run,Run,Hold,Not Required"'],
      showErrorMessage: true,
      errorTitle: 'Invalid Status',
      error: 'Please select: Not Run, Run, Hold, or Not Required'
    };
    statusCell.alignment = { vertical: 'top', horizontal: 'center' };
    statusCell.font = { name: 'Calibri', size: 10, bold: true };

    // Column J (10) Priority Dropdown (P0, P1, P2, P3)
    const priorityCell = row.getCell('Priority');
    priorityCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"P0,P1,P2,P3"']
    };
    priorityCell.alignment = { vertical: 'top', horizontal: 'center' };

    // Column K (11) Severity Dropdown
    const severityCell = row.getCell('Severity');
    severityCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Critical,High,Medium,Low"']
    };
    severityCell.alignment = { vertical: 'top', horizontal: 'center' };

    // Column P (16) Regression Dropdown
    const regressionCell = row.getCell('Regression');
    regressionCell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Yes,No"']
    };
    regressionCell.alignment = { vertical: 'top', horizontal: 'center' };
  }

  // ========================================================
  // SHEET 2: SUMMARY METRICS
  // ========================================================
  const ws2 = workbook.addWorksheet('Sheet 2 — Test Summary');
  ws2.columns = [
    { header: 'Category / Metric', key: 'cat', width: 36 },
    { header: 'Count / Value', key: 'val', width: 18 },
    { header: 'Details & Release Criteria', key: 'det', width: 70 }
  ];

  const summaryData = [
    { cat: 'Total Master Test Cases', val: allTestCases.length, det: 'Full suite covering all 5 platforms, 23 backend modules, and deep edge cases' },
    { cat: '--- TEST EXECUTION STATUS ---', val: '', det: 'Status choices: Not Run | Run | Hold | Not Required' },
    { cat: 'Not Run (Initial Default)', val: allTestCases.filter(t => t.Status === 'Not Run').length, det: 'Test cases currently pending execution by QA engineer' },
    { cat: 'Run', val: 0, det: 'Test cases executed and verified on build' },
    { cat: 'Hold', val: 0, det: 'Test execution temporarily paused due to environment or backend blocker' },
    { cat: 'Not Required', val: 0, det: 'Test cases skipped or out of scope for current sprint' },
    { cat: '--- PRIORITY BREAKDOWN ---', val: '', det: '' },
    { cat: 'P0 (Blocker / Critical Flow)', val: allTestCases.filter(t => t.Priority === 'P0').length, det: 'Must pass 100% before any production deployment' },
    { cat: 'P1 (High Priority & Edge Cases)', val: allTestCases.filter(t => t.Priority === 'P1').length, det: 'Essential business features & deep edge validations' },
    { cat: 'P2 (Medium Priority)', val: allTestCases.filter(t => t.Priority === 'P2').length, det: 'Secondary features, reviews, filters & UI checks' },
    { cat: 'P3 (Low Priority)', val: allTestCases.filter(t => t.Priority === 'P3').length, det: 'Cosmetic & non-critical flows' },
    { cat: '--- TEST TYPE BREAKDOWN ---', val: '', det: '' },
    { cat: 'Functional', val: allTestCases.filter(t => t.Test_Type === 'Functional').length, det: 'Positive & real-world workflows' },
    { cat: 'Security & RBAC', val: allTestCases.filter(t => t.Test_Type === 'Security').length, det: 'IDOR, HMAC validation, NoSQL injection, Throttling' },
    { cat: 'Boundary & Concurrency', val: allTestCases.filter(t => t.Test_Type === 'Boundary').length, det: 'Min order value, double-click idempotency, race conditions, floating point rounding' },
    { cat: 'Negative & Error Handling', val: allTestCases.filter(t => t.Test_Type === 'Negative').length, det: 'Invalid inputs, payment failures, expired coupons' },
    { cat: 'Performance & Load', val: allTestCases.filter(t => t.Test_Type === 'Performance').length, det: 'Socket reconnection storms, connection stampedes' },
    { cat: '--- PLATFORM BREAKDOWN ---', val: '', det: '' },
    { cat: '📱 Customer App (Flutter)', val: allTestCases.filter(t => t.User_Role === 'Customer' || t.Module.includes('Customer')).length, det: 'Auth, Cart, Coupons, Razorpay, Live Tracking, Reviews' },
    { cat: '🏪 Vendor Web Panel', val: allTestCases.filter(t => t.User_Role === 'Vendor' || t.Module.includes('Vendor')).length, det: 'Audio Alerts, Order Prep, Menu CRUD, Stock & Duty, Bank Payouts' },
    { cat: '🛵 Delivery Driver App', val: allTestCases.filter(t => t.User_Role === 'Driver' || t.Module.includes('Driver')).length, det: 'Duty Toggle, Auto-Dispatch, GPS Tracking, Delivery Completion, Earnings' },
    { cat: '💻 Admin Web Panel', val: allTestCases.filter(t => t.User_Role === 'Super Admin' || t.User_Role === 'Sub-Admin' || t.Module.includes('Admin')).length, det: 'Global Analytics, Zones Geofencing, Fleet Map, Settlements, Settings' },
    { cat: '⚡ Deep Edge Cases & Security', val: allTestCases.filter(t => t.Module.includes('Security') || t.Module.includes('Edge') || t.Module.includes('Geofencing') || t.Module.includes('State Machine') || t.Module.includes('Payments') || t.Module.includes('Fleet')).length, det: 'Cross-user IDOR, Webhooks, Signature tampering, Socket reconnection, GPS spoofing' },
  ];

  summaryData.forEach(d => ws2.addRow(d));

  ws2.getRow(1).height = 26;
  ws2.getRow(1).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ========================================================
  // SHEET 3: REQUIREMENTS MATRIX
  // ========================================================
  const ws3 = workbook.addWorksheet('Sheet 3 — Requirements');
  ws3.columns = [
    { header: 'Req_ID', key: 'Req_ID', width: 16 },
    { header: 'Module', key: 'Module', width: 24 },
    { header: 'Requirement_Description', key: 'Requirement_Description', width: 50 },
    { header: 'Mapped_TC_IDs', key: 'Mapped_TC_IDs', width: 38 },
    { header: 'Coverage_Status', key: 'Coverage_Status', width: 20 },
  ];

  const reqData = [
    { Req_ID: 'REQ-AUTH-01', Module: 'Authentication', Requirement_Description: 'Phone OTP login for customers via Firebase Auth with JWT sync', Mapped_TC_IDs: 'AUTH-TC-001, AUTH-TC-002, AUTH-TC-003, EDGE-SEC-002', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-AUTH-02', Module: 'Authentication', Requirement_Description: 'Email/Password authentication for Vendors, Drivers and Admin', Mapped_TC_IDs: 'AUTH-TC-004, AUTH-TC-005, AUTH-TC-006', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-RBAC-01', Module: 'Authorization', Requirement_Description: 'Role-Based Access Control enforcing panel & API permissions', Mapped_TC_IDs: 'AUTH-TC-007, AUTH-TC-008, AUTH-TC-009, SEC-TC-001', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-CUST-01', Module: 'Customer Experience', Requirement_Description: 'Address Book with GPS Map Picker and Default selection', Mapped_TC_IDs: 'CUST-TC-001, EDGE-GEO-001', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-CUST-02', Module: 'Customer Experience', Requirement_Description: 'Geofenced Home Feed showing nearby open restaurants & banners', Mapped_TC_IDs: 'CUST-TC-002, CUST-TC-003, EDGE-SEC-003', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-CUST-03', Module: 'Customer Experience', Requirement_Description: 'Restaurant Catalog with grouped categories, variants and add-ons', Mapped_TC_IDs: 'CUST-TC-004, EDGE-CONC-004', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-CART-01', Module: 'Cart & Coupons', Requirement_Description: 'Cart quantity management, multi-cart clear alerts, and promo codes', Mapped_TC_IDs: 'CUST-TC-005, CUST-TC-006, CUST-TC-007, CUST-TC-008, EDGE-SEC-001', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-ORD-01', Module: 'Orders & Payments', Requirement_Description: 'Cash on Delivery (COD) order checkout', Mapped_TC_IDs: 'ORD-TC-001, DRIV-TC-006, EDGE-PAY-004, EDGE-FLEET-002', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-PAY-01', Module: 'Orders & Payments', Requirement_Description: 'Razorpay UPI/Cards online payment with HMAC verification', Mapped_TC_IDs: 'ORD-TC-002, ORD-TC-003, SEC-TC-002, EDGE-PAY-001, EDGE-PAY-002, EDGE-PAY-005', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-ORD-02', Module: 'Orders & Payments', Requirement_Description: 'Idempotency key enforcement to prevent double-click duplicates', Mapped_TC_IDs: 'ORD-TC-004', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-LIVE-01', Module: 'Real-time Tracking', Requirement_Description: 'Real-time WebSocket status updates and Live GPS driver bike tracking', Mapped_TC_IDs: 'ORD-TC-005, ORD-TC-006, EDGE-TC-002, EDGE-NET-001, EDGE-NET-002, EDGE-NET-003', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-DOC-01', Module: 'Post-Order', Requirement_Description: 'PDF Invoice generation and Restaurant/Driver rating submission', Mapped_TC_IDs: 'ORD-TC-007, ORD-TC-008', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-VEND-01', Module: 'Vendor Panel', Requirement_Description: 'Continuous audio chime & visual modal for incoming kitchen orders', Mapped_TC_IDs: 'VEND-TC-001, VEND-TC-002, VEND-TC-003, VEND-TC-004, EDGE-CONC-002, EDGE-CONC-003', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-VEND-02', Module: 'Vendor Panel', Requirement_Description: 'Menu CRUD, S3 photo uploads, Out of stock toggles, Store duty switch', Mapped_TC_IDs: 'VEND-TC-005, VEND-TC-006, VEND-TC-007, SEC-TC-003', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-VEND-03', Module: 'Vendor Panel', Requirement_Description: 'Vendor Wallet earnings calculation & Bank withdrawal requests', Mapped_TC_IDs: 'VEND-TC-008, EDGE-PAY-003', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-DRIV-01', Module: 'Driver App', Requirement_Description: 'Online duty toggle, 30s auto-dispatch modal, in-app navigation', Mapped_TC_IDs: 'DRIV-TC-001, DRIV-TC-002, DRIV-TC-003, EDGE-CONC-001', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-DRIV-02', Module: 'Driver App', Requirement_Description: 'Pickup verification, background GPS streaming, COD cash collection', Mapped_TC_IDs: 'DRIV-TC-004, DRIV-TC-005, DRIV-TC-006, DRIV-TC-007, EDGE-GEO-002, EDGE-GEO-003, EDGE-FLEET-001', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-ADMN-01', Module: 'Admin Panel', Requirement_Description: 'Global Analytics, Polygon Geofencing, Restaurant Approval & Commission', Mapped_TC_IDs: 'ADMN-TC-001, ADMN-TC-002, ADMN-TC-003', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-ADMN-02', Module: 'Admin Panel', Requirement_Description: 'Live Fleet map, Manual dispatch, Batch settlements & System settings', Mapped_TC_IDs: 'ADMN-TC-004, ADMN-TC-005, ADMN-TC-006, ADMN-TC-007, ADMN-TC-008', Coverage_Status: '100% Covered' },
    { Req_ID: 'REQ-EDGE-01', Module: 'Edge Cases', Requirement_Description: 'Zero drivers online queueing and Out-of-stock race condition prevention', Mapped_TC_IDs: 'EDGE-TC-001, EDGE-TC-003', Coverage_Status: '100% Covered' },
  ];

  reqData.forEach(r => ws3.addRow(r));
  ws3.getRow(1).height = 26;
  ws3.getRow(1).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ========================================================
  // SHEET 4: DEFECT LOG
  // ========================================================
  const ws4 = workbook.addWorksheet('Sheet 4 — Defect Log');
  ws4.columns = [
    { header: 'Bug_ID', key: 'Bug_ID', width: 16 },
    { header: 'TC_ID', key: 'TC_ID', width: 16 },
    { header: 'Module', key: 'Module', width: 22 },
    { header: 'Bug_Title', key: 'Bug_Title', width: 40 },
    { header: 'Description', key: 'Description', width: 45 },
    { header: 'Steps_to_Reproduce', key: 'Steps_to_Reproduce', width: 40 },
    { header: 'Expected_Result', key: 'Expected_Result', width: 35 },
    { header: 'Actual_Result', key: 'Actual_Result', width: 35 },
    { header: 'Severity', key: 'Severity', width: 12 },
    { header: 'Priority', key: 'Priority', width: 10 },
    { header: 'Environment', key: 'Environment', width: 20 },
    { header: 'Browser', key: 'Browser', width: 18 },
    { header: 'Status', key: 'Status', width: 14 },
    { header: 'Assigned_To', key: 'Assigned_To', width: 18 },
    { header: 'Comments', key: 'Comments', width: 30 },
  ];

  const defectData = [
    {
      Bug_ID: 'BUG-001 (Sample)',
      TC_ID: 'AUTH-TC-002',
      Module: 'Authentication',
      Bug_Title: 'Invalid OTP entry causes blank screen instead of error toast',
      Description: 'When entering 000000 on OTP verification screen, app freezes on white screen.',
      Steps_to_Reproduce: '1. Enter phone +919999999999\n2. Enter OTP 000000\n3. Click Verify',
      Expected_Result: 'Displays red error message "Invalid OTP"',
      Actual_Result: 'White blank screen; app unresponsive',
      Severity: 'High',
      Priority: 'P1',
      Environment: 'Android 14 / Staging',
      Browser: 'Mobile App',
      Status: 'Open',
      Assigned_To: 'Mobile Lead',
      Comments: 'Fix exception handling in auth_cubit.dart'
    },
    {
      Bug_ID: 'BUG-002 (Sample)',
      TC_ID: 'EDGE-PAY-001',
      Module: 'Payments',
      Bug_Title: 'Order remains in PENDING state if user kills app during UPI redirect',
      Description: 'When client app is killed before receiving Razorpay callback, webhook handler took 15 minutes to process.',
      Steps_to_Reproduce: '1. Pay via GPay\n2. Immediately kill Rasikae app\n3. Check backend order status',
      Expected_Result: 'Webhook confirms order within 2 seconds of payment.captured event',
      Actual_Result: 'Order stuck in PENDING until manual reconciliation',
      Severity: 'Critical',
      Priority: 'P0',
      Environment: 'Production',
      Browser: 'Android 14',
      Status: 'In Progress',
      Assigned_To: 'Backend Lead',
      Comments: 'Webhook listener idempotency optimized'
    }
  ];

  defectData.forEach(d => ws4.addRow(d));
  ws4.getRow(1).height = 26;
  ws4.getRow(1).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ========================================================
  // SHEET 5: TEST DATA & STATUS GUIDE
  // ========================================================
  const ws5 = workbook.addWorksheet('Sheet 5 — Test Data');
  ws5.columns = [
    { header: 'Data Category', key: 'cat', width: 28 },
    { header: 'Key / Identifier', key: 'key', width: 28 },
    { header: 'Value / Credentials', key: 'val', width: 45 },
    { header: 'Usage / Purpose', key: 'use', width: 45 },
  ];

  const testData = [
    { cat: '--- STATUS FIELD OPTIONS ---', key: 'Allowed Dropdown Values', val: 'Not Run | Run | Hold | Not Required', use: 'Status column Q dropdown options' },
    { cat: 'Status Option 1', key: 'Not Run (Initial Default)', val: 'Not Run', use: 'Test case pending execution by QA engineer' },
    { cat: 'Status Option 2', key: 'Run', val: 'Run', use: 'Test case executed and verified' },
    { cat: 'Status Option 3', key: 'Hold', val: 'Hold', use: 'Execution paused due to blocker/dependency' },
    { cat: 'Status Option 4', key: 'Not Required', val: 'Not Required', use: 'Test case skipped for current sprint/build' },
    { cat: '--- CREDENTIALS & SECRETS ---', key: '', val: '', use: '' },
    { cat: 'Super Admin Credentials', key: 'admin@rasikae.com', val: 'Password: AdminSecurePass#2026', use: 'Super Admin Panel Login with full privileges' },
    { cat: 'Sub-Admin (Zone Manager)', key: 'zone_manager@rasikae.com', val: 'Password: ManagerPass@123', use: 'Restricted access to Orders & Fleet only' },
    { cat: 'Approved Vendor Account', key: 'vendor@rasikae.com', val: 'Password: Password@123', use: 'Vendor Web Panel access with pre-seeded restaurant' },
    { cat: 'Active Driver Account', key: '+91 9811122233', val: 'OTP: 123456 (or Password@123)', use: 'Delivery Driver App login with Active KYC' },
    { cat: 'Customer Test Account', key: '+91 9876543210', val: 'OTP: 123456', use: 'Customer App testing with pre-saved addresses' },
    { cat: 'Test Promo Codes', key: 'WELCOME50', val: '50% OFF up to ₹100, Min Order ₹200', use: 'Cart checkout coupon validation' },
    { cat: 'Test Promo Codes', key: 'FLAT100', val: 'Flat ₹100 OFF, Min Order ₹400', use: 'Flat discount verification' },
    { cat: 'Razorpay Test UPI ID', key: 'success@razorpay', val: 'Auto-success simulator', use: 'Razorpay payment confirmation test' },
    { cat: 'Razorpay Failure UPI', key: 'failure@razorpay', val: 'Auto-failure simulator', use: 'Payment failure resilience test' },
    { cat: 'Sample Geofence Zone', key: 'Central Zone Coordinates', val: '[[77.20, 28.61], [77.25, 28.61], [77.25, 28.65], [77.20, 28.65]]', use: 'GeoJSON Polygon creation in Admin Panel' },
    { cat: 'Default Delivery Base Fee', key: 'deliveryBaseFee', val: '4000 (₹40.00)', use: 'Global config in settings schema' },
    { cat: 'Default Commission Rate', key: 'platformCommissionPercentage', val: '0.15 (15%)', use: 'Platform take-rate deduction from restaurant subtotal' },
  ];

  testData.forEach(t => ws5.addRow(t));
  ws5.getRow(1).height = 26;
  ws5.getRow(1).eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Save Excel workbook with full formatting and dropdown validation
  const rootXlsx = path.resolve(__dirname, '../../..', 'Rasikae_Master_QA_Test_Suite.xlsx');
  const rootCsv1 = path.resolve(__dirname, '../../..', 'Rasikae_Master_QA_Test_Cases.csv');
  const rootCsv2 = path.resolve(__dirname, '../../..', 'Rasikae_Complete_Ecosystem_Test_Cases.csv');

  await workbook.xlsx.writeFile(rootXlsx);

  // Generate clean CSVs using XLSX
  const wbCsv = XLSX.utils.book_new();
  const wsJson = XLSX.utils.json_to_sheet(allTestCases);
  XLSX.utils.book_append_sheet(wbCsv, wsJson, 'TestCases');
  const csvContent = XLSX.utils.sheet_to_csv(wsJson);

  fs.writeFileSync(rootCsv1, csvContent, 'utf8');
  fs.writeFileSync(rootCsv2, csvContent, 'utf8');

  console.log('====================================================');
  console.log('✅ MASTER QA SUITE GENERATED WITH INTERACTIVE DROPDOWNS!');
  console.log('📂 Excel File Path:', rootXlsx);
  console.log('📂 CSV File 1:', rootCsv1);
  console.log('📂 CSV File 2:', rootCsv2);
  console.log('📊 Total Master Test Cases:', allTestCases.length);
  console.log('====================================================');
}

generateEnterpriseExcelWorkbook().catch(console.error);

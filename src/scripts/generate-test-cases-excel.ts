import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

export type TestCaseStatus = 'Not Run' | 'Run' | 'Hold' | 'Not Required';

export interface TestCase {
  'Test Case ID': string;
  'Platform / App': string;
  'Module / Feature': string;
  'Test Scenario / Description': string;
  'Preconditions': string;
  'Test Steps': string;
  'Test Data / Payload': string;
  'Expected Result': string;
  'Priority': 'High' | 'Medium' | 'Low';
  'Test Type': 'Functional' | 'Security' | 'UI/UX' | 'Real-time / WebSocket' | 'Payment' | 'Boundary' | 'Performance';
  'Status': TestCaseStatus;
}

// ==========================================
// 1. CUSTOMER APP (Flutter) - 30 TEST CASES
// ==========================================
const customerTestCases: TestCase[] = [
  {
    'Test Case ID': 'TC_CUST_001',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Auth & OTP',
    'Test Scenario / Description': 'User login with valid Indian 10-digit phone number and Firebase SMS OTP',
    'Preconditions': 'Customer App is installed; Backend running; Firebase Auth active',
    'Test Steps': '1. Open App\n2. Enter +91 9876543210\n3. Click Send OTP\n4. Enter OTP 123456\n5. Submit',
    'Test Data / Payload': 'Phone: +919876543210, OTP: 123456',
    'Expected Result': 'User authenticated; JWT token saved in secure storage; profile synced via /users/sync; redirects to Home Feed',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_002',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Auth & OTP',
    'Test Scenario / Description': 'Attempt login with invalid or incorrect 6-digit OTP',
    'Preconditions': 'OTP sent to mobile number',
    'Test Steps': '1. Enter valid phone number\n2. On OTP screen, enter 000000\n3. Click Verify',
    'Test Data / Payload': 'Phone: +919876543210, Invalid OTP: 000000',
    'Expected Result': 'Displays error message "Invalid OTP. Please try again"; user remains on OTP screen; no token generated',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_003',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Auth & OTP',
    'Test Scenario / Description': 'Phone number input field validation (<10 digits, >10 digits, letters, special characters)',
    'Preconditions': 'Login screen open',
    'Test Steps': '1. Enter "98765"\n2. Enter "987654321000"\n3. Enter "98765ABCD@"\n4. Observe button state',
    'Test Data / Payload': 'Inputs: "98765", "987654321000", "98765ABCD@"',
    'Expected Result': 'Non-numeric input blocked; "Send OTP" button disabled until exact 10 numeric digits entered',
    'Priority': 'Medium',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_004',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Auth & OTP',
    'Test Scenario / Description': 'Resend OTP countdown timer verification (30s cooldown)',
    'Preconditions': 'OTP requested',
    'Test Steps': '1. Request OTP\n2. Observe "Resend OTP in 30s" countdown\n3. Attempt clicking before timer hits 0\n4. Click after 30s',
    'Test Data / Payload': 'Timer: 30 seconds cooldown',
    'Expected Result': 'Resend button disabled during 30s countdown; becomes active after timer reaches 0; triggers new OTP on click',
    'Priority': 'Medium',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_005',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'User Profile',
    'Test Scenario / Description': 'Update customer profile name, email address, and avatar photo',
    'Preconditions': 'Customer logged in',
    'Test Steps': '1. Go to Account -> Edit Profile\n2. Update Name to "Sanjay Kumar"\n3. Update Email to "sanjay@example.com"\n4. Upload Avatar image\n5. Save',
    'Test Data / Payload': 'PATCH /users/profile { name: "Sanjay Kumar", email: "sanjay@example.com" }',
    'Expected Result': 'Profile updated in MongoDB; photo uploaded to S3; new details reflected across app without re-login',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_006',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Address Book',
    'Test Scenario / Description': 'Add new delivery address using interactive GPS Map Picker and flat details',
    'Preconditions': 'Customer logged in',
    'Test Steps': '1. Open "Saved Addresses"\n2. Click "Add Address"\n3. Move GPS pin on map to location\n4. Fill House/Flat No, Landmark\n5. Select tag "Home"\n6. Save',
    'Test Data / Payload': 'POST /addresses { label: "Home", street: "Flat 402, Lotus Tower", lat: 28.6139, lng: 77.2090 }',
    'Expected Result': 'Address saved with lat/lng coordinates; appears in saved address list; selectable at checkout',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_007',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Address Book',
    'Test Scenario / Description': 'Set address as Default, Edit details, and Delete address',
    'Preconditions': 'At least 2 saved addresses in list',
    'Test Steps': '1. Tap "Set as Default" on Address 2\n2. Edit Landmark on Address 1\n3. Swipe/Click to Delete Address 1',
    'Test Data / Payload': 'PATCH /addresses/:id, DELETE /addresses/:id',
    'Expected Result': 'Default address badge updates; edited data persists; deleted address removed from checkout picker',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_008',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Home Feed & Geofencing',
    'Test Scenario / Description': 'Dynamic Home Feed loading filtered by selected address delivery zone polygon',
    'Preconditions': 'Selected address at lat: 28.6139, lng: 77.2090',
    'Test Steps': '1. Open Home Feed\n2. Observe list of restaurants, ratings, delivery distance in km, and ETA in mins',
    'Test Data / Payload': 'GET /restaurants/home-feed?lat=28.6139&lng=77.2090',
    'Expected Result': 'Only restaurants delivering to user zone are shown; closed restaurants marked with "Closed" badge',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_009',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Home Feed Banners',
    'Test Scenario / Description': 'Promotional banner carousel display and deep-link navigation on click',
    'Preconditions': 'Active promotional campaigns configured by Admin',
    'Test Steps': '1. Swipe promotional banners on home feed\n2. Click banner "50% OFF Biryani Special"',
    'Test Data / Payload': 'Banner deep link: /category/biryani or /restaurant/:id',
    'Expected Result': 'Redirects directly to the tagged Biryani category or restaurant menu page',
    'Priority': 'Medium',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_010',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Categories & Cuisines',
    'Test Scenario / Description': 'Browse by food categories (Pizza, Biryani, Burgers, Chinese, Desserts)',
    'Preconditions': 'Categories seeded in database',
    'Test Steps': '1. Tap Category "North Indian"\n2. Observe filtered list of matching restaurants and dishes',
    'Test Data / Payload': 'GET /restaurants/category/:id',
    'Expected Result': 'Lists only restaurants serving North Indian cuisine within active delivery zone',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_011',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Search & Debounce',
    'Test Scenario / Description': 'Global search bar searching dishes and restaurants with 400ms debounce',
    'Preconditions': 'Search bar open',
    'Test Steps': '1. Type "Butter Paneer"\n2. Rapidly type and observe network calls\n3. View search results list',
    'Test Data / Payload': 'Query: "Butter Paneer"',
    'Expected Result': 'Debounce prevents spamming API on every keystroke; returns matching dishes and restaurants accurately',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_012',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Search Filters - Pure Veg',
    'Test Scenario / Description': 'Toggle "Pure Veg" filter switch across search results and menu list',
    'Preconditions': 'Restaurants have both Veg and Non-veg items',
    'Test Steps': '1. Search "Noodles"\n2. Toggle "Pure Veg" switch to ON\n3. Observe displayed dishes',
    'Test Data / Payload': 'Filter: isVeg=true',
    'Expected Result': 'All non-veg (green dot badge only) items hidden; only Pure Veg dishes displayed',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_013',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Search Filters & Sorting',
    'Test Scenario / Description': 'Filter by Rating 4.0+ and Sort by Cost: Low to High',
    'Preconditions': 'Search results displayed',
    'Test Steps': '1. Tap Filter "Rating 4.0+"\n2. Tap Sort "Price: Low to High"\n3. Apply filters',
    'Test Data / Payload': 'minRating: 4.0, sort: "price_asc"',
    'Expected Result': 'Results re-ordered in ascending price with average rating >= 4.0 stars',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_014',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Restaurant Menu Catalog',
    'Test Scenario / Description': 'Restaurant menu display organized by grouped categories (Starters, Main Course, Breads, Beverages)',
    'Preconditions': 'Restaurant is open',
    'Test Steps': '1. Open "The Royal Biryani" menu\n2. Scroll categories\n3. Tap floating "Menu" quick jump button',
    'Test Data / Payload': 'GET /menu-items/restaurant/:id',
    'Expected Result': 'Dishes grouped under correct section headers with prices, photos, veg/non-veg tags, and descriptions',
    'Priority': 'High',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_015',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Dish Variants & Customizations',
    'Test Scenario / Description': 'Select item variants (Size: Medium/Large) and add-ons (Extra Cheese, Dips) with price recalculation',
    'Preconditions': 'Item has configurable add-ons',
    'Test Steps': '1. Tap "+" on "Chicken Biryani"\n2. Select Size "Large (+₹100)"\n3. Select Add-on "Extra Gravy (+₹40)"\n4. Tap "Add to Cart (₹390)"',
    'Test Data / Payload': 'Base ₹250 + Size ₹100 + Add-on ₹40 = Total ₹390',
    'Expected Result': 'Modal calculates exact total ₹390; item with selected choices added to floating cart bar',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_016',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Multi-Restaurant Cart Conflict',
    'Test Scenario / Description': 'Add item from Restaurant A, then attempt adding item from Restaurant B',
    'Preconditions': 'Cart contains 2 items from Restaurant A',
    'Test Steps': '1. Add 2 items from "Restaurant A"\n2. Navigate to "Restaurant B"\n3. Tap "+" on any item from Restaurant B',
    'Test Data / Payload': 'Multi-restaurant cart conflict prompt',
    'Expected Result': 'Warning modal appears: "Replace cart items? Your cart has items from Restaurant A. Discard and add from Restaurant B?" with Discard/Cancel buttons',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_017',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Cart Quantity Modification',
    'Test Scenario / Description': 'Increment/decrement item count in cart and verify live total recalculation',
    'Preconditions': 'Items in cart',
    'Test Steps': '1. Open Cart\n2. Tap "+" to increase qty from 1 to 3\n3. Tap "-" to decrease qty to 1\n4. Tap "-" again on qty 1',
    'Test Data / Payload': 'Item price: ₹150',
    'Expected Result': 'Subtotal multiplies correctly; decreasing qty 1 prompts item removal or removes item from cart',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_018',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Minimum Order Value Restriction',
    'Test Scenario / Description': 'Enforce minimum order value threshold (minOrderValue = ₹200) before checkout',
    'Preconditions': 'Restaurant minOrderValue = ₹200; Cart total = ₹120',
    'Test Steps': '1. Add item of ₹120 to cart\n2. Open Cart screen\n3. Observe "Proceed to Checkout" button state',
    'Test Data / Payload': 'Cart: ₹120 (< ₹200 threshold)',
    'Expected Result': 'Button disabled with banner "Add ₹80 more to place order"; enables when subtotal >= ₹200',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_019',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Cooking & Delivery Instructions',
    'Test Scenario / Description': 'Add special cooking note and delivery partner instructions during checkout',
    'Preconditions': 'Cart open',
    'Test Steps': '1. Type Cooking Note: "Less spicy, extra green chillies"\n2. Select Delivery Note: "Leave at door / Ring bell"\n3. Place Order',
    'Test Data / Payload': 'cookingInstructions: "Less spicy", deliveryNotes: "Leave at door"',
    'Expected Result': 'Instructions saved in order payload; visible on Vendor kitchen screen and Driver delivery view',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_020',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Coupons - Percentage Discount with Cap',
    'Test Scenario / Description': 'Apply coupon "FIRST50" (50% OFF up to ₹100, min order ₹200)',
    'Preconditions': 'Cart subtotal = ₹350',
    'Test Steps': '1. On Cart screen, tap "Apply Coupon"\n2. Enter "FIRST50"\n3. Click Apply',
    'Test Data / Payload': 'Subtotal: ₹350, 50% = ₹175 -> Capped at ₹100',
    'Expected Result': 'POST /promotions/validate succeeds; ₹100 discount deducted from bill; breakdown displays Subtotal, -₹100 Discount, Tax, Delivery, To Pay',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_021',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Coupons - Flat Discount',
    'Test Scenario / Description': 'Apply coupon "FLAT100" (Flat ₹100 OFF on orders above ₹400)',
    'Preconditions': 'Cart subtotal = ₹450',
    'Test Steps': '1. Enter code "FLAT100"\n2. Click Apply',
    'Test Data / Payload': 'Subtotal: ₹450 -> Discount: ₹100',
    'Expected Result': 'Bill total reduces by flat ₹100; green banner displays "₹100 saved with FLAT100"',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_022',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Coupons - Invalid / Expired Code',
    'Test Scenario / Description': 'Apply non-existent or expired coupon code',
    'Preconditions': 'Cart open',
    'Test Steps': '1. Enter "EXPIRED99"\n2. Click Apply',
    'Test Data / Payload': 'Code: "EXPIRED99"',
    'Expected Result': 'Displays error message "Invalid or expired promo code"; bill total remains unchanged',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_023',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Checkout - Cash on Delivery (COD)',
    'Test Scenario / Description': 'Place order using Cash on Delivery payment method',
    'Preconditions': 'Items in cart, address selected',
    'Test Steps': '1. Select "Cash on Delivery"\n2. Click "Place Order (COD)"',
    'Test Data / Payload': 'POST /orders/checkout { paymentMethod: "COD" }',
    'Expected Result': 'Order created with status "PENDING"; cart cleared; sound plays; redirects to Live Tracking screen with Order ID',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_024',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Checkout - Razorpay Online Payment',
    'Test Scenario / Description': 'Complete test payment via Razorpay UPI / Card and verify HMAC signature',
    'Preconditions': 'Razorpay Test keys configured',
    'Test Steps': '1. Select "Online Payment (UPI/Cards)"\n2. Tap "Pay ₹350"\n3. Complete payment in Razorpay modal\n4. App triggers /orders/confirm-payment',
    'Test Data / Payload': 'Test UPI: success@razorpay',
    'Expected Result': 'HMAC signature verified on backend; Order status becomes "CONFIRMED"; Vendor alerted immediately',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_025',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Checkout - Razorpay Payment Cancelled / Failed',
    'Test Scenario / Description': 'User cancels payment modal or bank transaction fails',
    'Preconditions': 'Razorpay modal open',
    'Test Steps': '1. Tap "Pay Online"\n2. Click "X" close button in Razorpay modal\n3. Confirm cancellation',
    'Test Data / Payload': 'Payment cancel event',
    'Expected Result': 'Displays message "Payment was cancelled. You can retry or choose COD"; cart items remain intact; no unpaid order created',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_026',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Live Tracking - Status Progression',
    'Test Scenario / Description': 'Live order status updates in real-time via WebSockets (PLACED -> ACCEPTED -> PREPARING -> READY -> OUT_FOR_DELIVERY -> DELIVERED)',
    'Preconditions': 'Customer on tracking screen',
    'Test Steps': '1. Keep live tracking screen open\n2. Vendor and Driver update order status',
    'Test Data / Payload': 'WebSocket events: "order:status_updated"',
    'Expected Result': 'Status stepper advances automatically with smooth animation and sound without pulling to refresh',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_027',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Live Tracking - Moving Driver Bike Map',
    'Test Scenario / Description': 'Driver travels on road; customer watches real-time bike marker movement and dynamic ETA',
    'Preconditions': 'Order status is "OUT_FOR_DELIVERY"',
    'Test Steps': '1. Open Live Map\n2. Driver transmits GPS stream every 5s',
    'Test Data / Payload': 'Driver coordinates stream',
    'Expected Result': 'Bike marker rotates and moves smoothly along polyline route; ETA updates dynamically (e.g. "Arriving in 6 mins")',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_028',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Post-Order - PDF Invoice Download',
    'Test Scenario / Description': 'Download official PDF tax invoice for completed order',
    'Preconditions': 'Order status is "DELIVERED"',
    'Test Steps': '1. Open delivered order in Order History\n2. Tap "Download Invoice"',
    'Test Data / Payload': 'GET /orders/:id/invoice',
    'Expected Result': 'PDF invoice downloads to device storage containing Order ID, Restaurant GST, Itemized bill, and Tax breakdown',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_029',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Post-Order - Ratings & Reviews',
    'Test Scenario / Description': 'Submit 1-5 star ratings and reviews for food quality and delivery partner',
    'Preconditions': 'Order status is "DELIVERED"',
    'Test Steps': '1. Tap "Rate Order"\n2. Select 5 stars for Food, 5 stars for Driver\n3. Type "Super fast and hot food!"\n4. Submit',
    'Test Data / Payload': 'POST /reviews { rating: 5, comment: "..." }',
    'Expected Result': 'Review saved; restaurant average rating recalculated; review visible under restaurant public profile',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_CUST_030',
    'Platform / App': 'Customer App (Flutter)',
    'Module / Feature': 'Order History & Reorder',
    'Test Scenario / Description': 'View past delivered/cancelled orders and click "Reorder" to populate cart',
    'Preconditions': 'Customer has past delivered orders',
    'Test Steps': '1. Go to "My Orders"\n2. Select past order\n3. Tap "Reorder"',
    'Test Data / Payload': 'POST /cart/reorder/:orderId',
    'Expected Result': 'Same items and variants added to active cart; user redirected directly to checkout screen',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  }
];

// ==========================================
// 2. VENDOR WEB PANEL - 20 TEST CASES
// ==========================================
const vendorTestCases: TestCase[] = [
  {
    'Test Case ID': 'TC_VEND_001',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Vendor Login & Authentication',
    'Test Scenario / Description': 'Vendor logs into Web Panel using registered email and password',
    'Preconditions': 'Vendor account approved by Admin in DB',
    'Test Steps': '1. Open Vendor Web Panel URL\n2. Enter vendor@rasikae.com / Password@123\n3. Click "Sign In"',
    'Test Data / Payload': 'POST /auth/vendor-login { email, password }',
    'Expected Result': 'JWT token saved; role verified as "vendor"; redirected to Vendor Live Orders Dashboard',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_002',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Vendor Login - Invalid / Unapproved Account',
    'Test Scenario / Description': 'Attempt login with wrong password or unapproved pending vendor account',
    'Preconditions': 'Vendor account in "pending_approval" status',
    'Test Steps': '1. Enter credentials\n2. Click "Sign In"',
    'Test Data / Payload': 'Invalid password or unapproved account',
    'Expected Result': 'Displays error message "Account pending admin approval or invalid credentials"; access blocked',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_003',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Incoming Order Audio Chime Alert',
    'Test Scenario / Description': 'Continuous loud audio ringing and visual popup on receiving new customer order',
    'Preconditions': 'Vendor dashboard open in browser tab',
    'Test Steps': '1. Customer places new order\n2. Observe vendor dashboard screen and sound',
    'Test Data / Payload': 'WebSocket event: "order:new_for_vendor"',
    'Expected Result': 'Loud audio chime loops continuously; modal displays customer name, item checklist, and delivery address',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_004',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Order Acceptance & Prep Duration',
    'Test Scenario / Description': 'Vendor accepts order and selects kitchen prep duration (e.g. 20 mins)',
    'Preconditions': 'Incoming order modal active',
    'Test Steps': '1. Select Prep Time "20 mins"\n2. Click "Accept Order"',
    'Test Data / Payload': 'PATCH /orders/:id/status { status: "PREPARING", prepTimeMinutes: 20 }',
    'Expected Result': 'Audio stops; order moves to "Preparing" column with countdown timer; Customer app notified',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_005',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Order Rejection & Cancellation Reason',
    'Test Scenario / Description': 'Vendor rejects incoming order with reason (e.g. "Items out of stock")',
    'Preconditions': 'Incoming order modal active',
    'Test Steps': '1. Click "Reject Order"\n2. Select reason "Kitchen Overloaded / Out of stock"\n3. Confirm',
    'Test Data / Payload': 'PATCH /orders/:id/status { status: "CANCELLED", cancelReason: "..." }',
    'Expected Result': 'Order status becomes "CANCELLED"; Customer notified with reason; online payments auto-refunded',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_006',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Mark Food "Ready for Pickup"',
    'Test Scenario / Description': 'Vendor clicks "Ready for Pickup / Food Prepared" when cooking completed',
    'Preconditions': 'Order in "PREPARING" status',
    'Test Steps': '1. Locate order in Preparing tab\n2. Click "Ready for Pickup"',
    'Test Data / Payload': 'PATCH /orders/:id/status { status: "READY_FOR_PICKUP" }',
    'Expected Result': 'Status becomes "READY_FOR_PICKUP"; nearby assigned driver receives pickup alert; customer tracking updates',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_007',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Menu Item CRUD & S3 Image Upload',
    'Test Scenario / Description': 'Add new dish with photo upload, title, price, veg/non-veg tag, and category',
    'Preconditions': 'Vendor logged in',
    'Test Steps': '1. Go to "Menu Management"\n2. Click "Add Item"\n3. Upload photo (JPG/PNG)\n4. Enter Name "Kadhai Paneer", Price ₹280, Pure Veg\n5. Save',
    'Test Data / Payload': 'POST /menu-items (Multipart form-data with image)',
    'Expected Result': 'Image uploaded to AWS S3; dish saved in DB; immediately visible and orderable on Customer App',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_008',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Menu Item Edit & Price Update',
    'Test Scenario / Description': 'Edit dish description and update price from ₹280 to ₹300',
    'Preconditions': 'Dish exists in menu list',
    'Test Steps': '1. Click "Edit" on Kadhai Paneer\n2. Change price to ₹300\n3. Save Changes',
    'Test Data / Payload': 'PATCH /menu-items/:id { price: 30000 }',
    'Expected Result': 'Updated price reflects immediately across all customer mobile apps',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_009',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Menu Item Delete & Cart Invalidation',
    'Test Scenario / Description': 'Delete discontinued menu item from vendor catalog',
    'Preconditions': 'Dish exists in menu',
    'Test Steps': '1. Click "Delete" on dish\n2. Confirm deletion dialog',
    'Test Data / Payload': 'DELETE /menu-items/:id',
    'Expected Result': 'Dish soft-deleted in DB; removed from Customer App catalog; rejected if currently in active checkout',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_010',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Dish Add-ons & Variant Creation',
    'Test Scenario / Description': 'Configure size variants (Regular, Medium, Large) and optional add-ons (Extra Cheese, Dips)',
    'Preconditions': 'Menu item edit screen open',
    'Test Steps': '1. Open "Variants & Add-ons" tab\n2. Add Variant "Large" (+₹60)\n3. Add Add-on "Extra Dip" (+₹25)\n4. Save',
    'Test Data / Payload': 'variants: [...], addOns: [...]',
    'Expected Result': 'Variants and add-ons display on customer app customization popup with correct prices',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_011',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Instant Item Stock Toggle ("Out of Stock")',
    'Test Scenario / Description': 'Toggle item switch to "Out of Stock" during peak kitchen rush hours',
    'Preconditions': 'Dish currently available',
    'Test Steps': '1. Find dish in menu table\n2. Flip availability toggle to OFF',
    'Test Data / Payload': 'PATCH /menu-items/:id/availability { isAvailable: false }',
    'Expected Result': 'Customer app instantly shows dish with "Out of Stock" disabled button in real-time',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_012',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Master Restaurant Duty Switch ("Open / Closed")',
    'Test Scenario / Description': 'Toggle restaurant master switch to "Closed / Not Accepting Orders"',
    'Preconditions': 'Restaurant currently open',
    'Test Steps': '1. Tap master "Restaurant Open" switch in header\n2. Confirm closure dialog',
    'Test Data / Payload': 'PATCH /restaurants/:id/status { isOpen: false }',
    'Expected Result': 'Restaurant card on customer app displays "Currently Closed"; cart checkout disabled for this store',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_013',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Operating Hours Schedule Setup',
    'Test Scenario / Description': 'Configure automated store opening & closing schedule (e.g. 10:00 AM - 11:30 PM)',
    'Preconditions': 'Vendor on Store Settings screen',
    'Test Steps': '1. Set Open Time = 10:00 AM, Close Time = 11:30 PM\n2. Save Schedule',
    'Test Data / Payload': 'operatingHours: { open: "10:00", close: "23:30" }',
    'Expected Result': 'Store automatically switches to Open at 10 AM and Closed at 11:30 PM based on server time',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_014',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Live Orders Pipeline Kanban Board',
    'Test Scenario / Description': 'Manage orders across Kanban stages (New Orders -> Preparing -> Ready -> Out for Delivery)',
    'Preconditions': 'Active orders in system',
    'Test Steps': '1. View Live Orders Kanban columns\n2. Progress orders across stages',
    'Test Data / Payload': 'Kanban pipeline state',
    'Expected Result': 'Orders organized in real-time columns with live timers and customer order summaries',
    'Priority': 'High',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_015',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Order History & Date Range Filters',
    'Test Scenario / Description': 'Filter past completed orders by Date Range (Today, Last 7 Days, Custom Date)',
    'Preconditions': 'Past orders in DB',
    'Test Steps': '1. Go to "Order History"\n2. Select Date Filter "Last 7 Days"\n3. Search Order ID #ORD-1002',
    'Test Data / Payload': 'GET /orders/restaurant/:id?startDate=...&endDate=...',
    'Expected Result': 'Lists matching historical orders with itemized breakdown, bill values, and payment methods',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_016',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Vendor Wallet & Platform Commission Calculation',
    'Test Scenario / Description': 'Verify net earnings calculation (Gross Food Sales - 15% Platform Commission = Net Payout)',
    'Preconditions': 'Restaurant has completed orders totaling ₹10,000',
    'Test Steps': '1. Open "Wallet & Earnings"\n2. Verify Gross Sales = ₹10,000, Commission (15%) = ₹1,500, Net Balance = ₹8,500',
    'Test Data / Payload': 'Net = Gross - (Gross * 0.15)',
    'Expected Result': 'Wallet ledger matches mathematical calculations exactly with 0 rounding errors',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_017',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Bank Account & Payout Details Setup',
    'Test Scenario / Description': 'Add and verify vendor bank account details (Account Number, IFSC, Account Holder Name)',
    'Preconditions': 'Vendor logged in',
    'Test Steps': '1. Go to "Bank Settings"\n2. Enter Account Number, IFSC code, Bank Name\n3. Save Bank Details',
    'Test Data / Payload': 'bankDetails: { accountNumber, ifsc, holderName }',
    'Expected Result': 'IFSC format validated; bank details saved securely for payout settlements',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_018',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Payout Withdrawal Request Creation',
    'Test Scenario / Description': 'Submit withdrawal request for ₹5,000 from available wallet balance',
    'Preconditions': 'Available wallet balance >= ₹5,000',
    'Test Steps': '1. Tap "Request Payout"\n2. Enter amount ₹5,000\n3. Submit Request',
    'Test Data / Payload': 'POST /wallets/restaurant/:id/withdraw { amount: 500000 }',
    'Expected Result': 'Payout request created in "PENDING" status; balance locked; visible on Admin Finance panel',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_019',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Print Kitchen Order Ticket (KOT)',
    'Test Scenario / Description': 'Click "Print KOT" on new order to send ticket to thermal kitchen printer',
    'Preconditions': 'New order received',
    'Test Steps': '1. Open order modal\n2. Click "Print KOT / Receipt"',
    'Test Data / Payload': 'Browser print dialog',
    'Expected Result': 'Formatted thermal slip opens with Order #, Timestamp, Item List, and Special Cooking Notes',
    'Priority': 'Medium',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_VEND_020',
    'Platform / App': 'Vendor Web Panel',
    'Module / Feature': 'Browser Audio Autoplay Permission',
    'Test Scenario / Description': 'Browser audio permission banner prompt to enable incoming order ringing',
    'Preconditions': 'First time loading Vendor Panel on Chrome/Safari',
    'Test Steps': '1. Load dashboard\n2. Observe "Enable Audio Alert" prompt\n3. Click "Enable Audio"',
    'Test Data / Payload': 'AudioContext unlock gesture',
    'Expected Result': 'AudioContext unlocked; sound alert test chime plays successfully',
    'Priority': 'High',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  }
];

// ==========================================
// 3. DELIVERY DRIVER APP - 20 TEST CASES
// ==========================================
const driverTestCases: TestCase[] = [
  {
    'Test Case ID': 'TC_DRIV_001',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Driver Login & Phone Check',
    'Test Scenario / Description': 'Driver logs in with registered phone number and verifies active onboarding status',
    'Preconditions': 'Driver profile approved by Admin',
    'Test Steps': '1. Open Driver App\n2. Enter registered phone number\n3. Verify OTP\n4. App triggers /drivers/check-phone',
    'Test Data / Payload': 'Phone: +919811122233, OTP: 123456',
    'Expected Result': 'Driver verified as ACTIVE; lands on Driver Duty toggle screen',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_002',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Driver Pending KYC Screen',
    'Test Scenario / Description': 'Driver with pending or rejected KYC documents attempts login',
    'Preconditions': 'Driver status is "PENDING_VERIFICATION"',
    'Test Steps': '1. Login with pending account',
    'Test Data / Payload': 'Pending driver profile',
    'Expected Result': 'App shows "Documents Under Review. You will be notified once approved"; duty toggle disabled',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_003',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Go Online / Offline Duty Switch',
    'Test Scenario / Description': 'Driver slides toggle to go "Online" for deliveries and detects active zone',
    'Preconditions': 'GPS location permission granted',
    'Test Steps': '1. Slide "Go Online" toggle to Right\n2. Observe header indicator',
    'Test Data / Payload': 'PATCH /drivers/:id/status { isOnline: true, isAvailable: true }',
    'Expected Result': 'Header turns green "ONLINE - Searching for deliveries"; driver pin appears on Admin live map',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_004',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Auto-Dispatch Incoming Alert (30s Ringtone)',
    'Test Scenario / Description': 'Dispatch algorithm assigns order to nearest driver with 30s countdown modal',
    'Preconditions': 'Driver is Online in Zone; Order ready for pickup',
    'Test Steps': '1. Backend dispatches order\n2. Observe driver phone screen and sound',
    'Test Data / Payload': 'Pickup: "The Burger Hub" (1.5 km), Drop: "Sector 14" (3 km), Earning: ₹45',
    'Expected Result': 'Loud alert chime plays; popup modal displays Pickup Restaurant, Delivery Distance, Estimated Earning (₹45), and 30s countdown',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_005',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Reject / Timeout Delivery Request',
    'Test Scenario / Description': 'Driver taps "Reject" or allows 30s countdown timer to expire',
    'Preconditions': 'Incoming delivery popup active',
    'Test Steps': '1. Tap "Reject" or wait 30 seconds',
    'Test Data / Payload': 'Reject / Timeout event',
    'Expected Result': 'Modal closes; order automatically re-dispatches to next nearest online driver in zone',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_006',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Accept Delivery & Lock Assignment',
    'Test Scenario / Description': 'Driver taps "Accept Delivery" and locks order assignment',
    'Preconditions': 'Incoming delivery popup active',
    'Test Steps': '1. Tap "Accept Delivery"',
    'Test Data / Payload': 'PATCH /orders/:id/assign-driver { driverId }',
    'Expected Result': 'Order status becomes "DRIVER_ASSIGNED"; locked to driver; pickup navigation button appears',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_007',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Google Maps Navigation to Restaurant',
    'Test Scenario / Description': 'Driver taps "Navigate to Restaurant" to open turn-by-turn navigation',
    'Preconditions': 'Order accepted',
    'Test Steps': '1. Tap "Navigate to Restaurant"',
    'Test Data / Payload': 'Restaurant coordinates: Lat 28.6139, Lng 77.2090',
    'Expected Result': 'Google Maps turn-by-turn navigation launches with route to restaurant doorstep',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_008',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Arrived at Restaurant Check-in',
    'Test Scenario / Description': 'Driver reaches restaurant location and taps "Arrived at Restaurant"',
    'Preconditions': 'Driver near restaurant GPS coordinates',
    'Test Steps': '1. Tap "Arrived at Restaurant"',
    'Test Data / Payload': 'Status update: DRIVER_ARRIVED_RESTAURANT',
    'Expected Result': 'Status updates; vendor informed driver has arrived; order checklist opens on driver screen',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_009',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Order Items Verification Checklist',
    'Test Scenario / Description': 'Driver verifies order item checklist with restaurant staff before collection',
    'Preconditions': 'Driver at restaurant',
    'Test Steps': '1. Check off each item on list (e.g. 2x Biryani, 1x Raita)\n2. Slide "Confirm Pickup"',
    'Test Data / Payload': 'Order item checklist',
    'Expected Result': 'Ensures all items collected before leaving kitchen',
    'Priority': 'Medium',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_010',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Start Delivery & Transition OUT_FOR_DELIVERY',
    'Test Scenario / Description': 'Driver slides "Confirm Pickup & Start Delivery"',
    'Preconditions': 'Food collected from vendor',
    'Test Steps': '1. Slide "Confirm Pickup & Start Delivery"',
    'Test Data / Payload': 'PATCH /orders/:id/status { status: "OUT_FOR_DELIVERY" }',
    'Expected Result': 'Order status becomes "OUT_FOR_DELIVERY"; customer notified; navigation switches to Customer Drop Address',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_011',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Turn-by-Turn Navigation to Customer',
    'Test Scenario / Description': 'Launch Google Maps navigation to customer drop coordinates',
    'Preconditions': 'Order in OUT_FOR_DELIVERY',
    'Test Steps': '1. Tap "Navigate to Customer"',
    'Test Data / Payload': 'Customer drop coordinates',
    'Expected Result': 'Google Maps opens with fastest traffic route to customer building',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_012',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Background GPS Location Streaming',
    'Test Scenario / Description': 'Driver app transmits live GPS coordinates every 5s while phone is locked in pocket',
    'Preconditions': 'Order in OUT_FOR_DELIVERY status',
    'Test Steps': '1. Start riding bike towards customer\n2. Lock phone screen (put in pocket)\n3. Check backend GPS stream',
    'Test Data / Payload': 'PATCH /drivers/:id/location { lat, lng, heading } every 5s',
    'Expected Result': 'Background location service streams continuously without interruption; customer map marker moves smoothly',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_013',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Customer Masked Phone Call',
    'Test Scenario / Description': 'Driver calls customer for gate code / landmark clarification',
    'Preconditions': 'Active delivery order',
    'Test Steps': '1. Tap "Call Customer" icon\n2. Phone dialer opens with customer masked phone',
    'Test Data / Payload': 'Phone dialer integration',
    'Expected Result': 'Initiates call to customer for delivery coordination',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_014',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Arrived at Customer Doorstep',
    'Test Scenario / Description': 'Driver arrives at customer building and taps "Arrived at Customer"',
    'Preconditions': 'Driver near drop coordinates',
    'Test Steps': '1. Tap "Arrived at Customer"',
    'Test Data / Payload': 'Status: DRIVER_ARRIVED_CUSTOMER',
    'Expected Result': 'Customer receives push notification: "Your delivery partner has arrived at your door"',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_015',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Cash on Delivery (COD) Cash Collection',
    'Test Scenario / Description': 'Driver collects cash amount (₹350) and confirms cash collection',
    'Preconditions': 'Order is Cash on Delivery ₹350',
    'Test Steps': '1. Collect ₹350 in cash from customer\n2. Check box "Collected ₹350 Cash"\n3. Slide Complete Delivery',
    'Test Data / Payload': 'codCollected: 350',
    'Expected Result': 'COD cash recorded in driver cash-in-hand ledger; delivery marked complete',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_016',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Complete Delivery & Wallet Credit',
    'Test Scenario / Description': 'Driver slides "Complete Delivery" to finalize order lifecycle',
    'Preconditions': 'Driver at customer doorstep',
    'Test Steps': '1. Slide "Complete Delivery"',
    'Test Data / Payload': 'PATCH /orders/:id/status { status: "DELIVERED" }',
    'Expected Result': 'Order marked "DELIVERED"; Delivery fee (e.g. ₹45) credited to Driver Wallet; driver returned to available queue',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_017',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Daily Completed Trips Summary',
    'Test Scenario / Description': 'View list of all completed trips for Today with pickup/drop addresses and earnings',
    'Preconditions': 'Driver completed trips today',
    'Test Steps': '1. Open "Trips" tab\n2. Select "Today"',
    'Test Data / Payload': 'GET /drivers/:id/trips?filter=today',
    'Expected Result': 'Itemized list of all deliveries, timestamps, delivery fees, and tips',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_018',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Driver Earnings & Incentives Dashboard',
    'Test Scenario / Description': 'Verify daily earnings total (Base pay + Distance surge + Tips = Total Earnings)',
    'Preconditions': 'Driver completed 5 orders totaling ₹250 + ₹50 tip',
    'Test Steps': '1. Open "Earnings" tab\n2. Verify Today Total = ₹300',
    'Test Data / Payload': 'GET /wallets/driver/:id/earnings',
    'Expected Result': 'Earnings breakdown computed accurately with clear daily, weekly, and monthly totals',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_019',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Driver Cash-in-Hand vs Max Threshold',
    'Test Scenario / Description': 'Check accumulated COD cash in hand and alert when reaching platform limit (₹2,500)',
    'Preconditions': 'Driver cash in hand = ₹2,200',
    'Test Steps': '1. Open Wallet\n2. View Cash-in-Hand balance vs Limit',
    'Test Data / Payload': 'maxCashLimit: 2500',
    'Expected Result': 'Shows remaining COD allowance; warns when cash in hand exceeds threshold',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_DRIV_020',
    'Platform / App': 'Delivery Driver App',
    'Module / Feature': 'Driver Bank Payout Withdrawal Request',
    'Test Scenario / Description': 'Driver requests payout transfer of ₹1,500 to registered bank account/UPI',
    'Preconditions': 'Driver wallet balance >= ₹1,500',
    'Test Steps': '1. Tap "Withdraw Earnings"\n2. Enter ₹1,500\n3. Submit Request',
    'Test Data / Payload': 'POST /wallets/driver/:id/withdraw { amount: 150000 }',
    'Expected Result': 'Withdrawal request created in "PENDING" status; balance locked for Admin settlement',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  }
];

// ==========================================
// 4. ADMIN WEB PANEL - 20 TEST CASES
// ==========================================
const adminTestCases: TestCase[] = [
  {
    'Test Case ID': 'TC_ADMN_001',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Super Admin Login & Session',
    'Test Scenario / Description': 'Super Admin logs into Web Dashboard with admin credentials',
    'Preconditions': 'Super Admin user in MongoDB with role "admin"',
    'Test Steps': '1. Open Admin Panel URL\n2. Enter admin@rasikae.com / AdminSecurePass#2026\n3. Click Login',
    'Test Data / Payload': 'POST /auth/login { email, password }',
    'Expected Result': 'Admin authenticated; full sidebar rendered (Analytics, Zones, Restaurants, Fleet, Settlements, Settings)',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_002',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Global Analytics KPI Cards',
    'Test Scenario / Description': 'View live platform metrics: Gross Merchandise Value (GMV), Total Orders, Net Commission, Active Drivers',
    'Preconditions': 'Admin logged in',
    'Test Steps': '1. Open Analytics Dashboard\n2. Select Date Filter "This Month"\n3. Verify KPI stats',
    'Test Data / Payload': 'GET /analytics/global',
    'Expected Result': 'Aggregates GMV, total commissions, active driver fleet, and order volume accurately',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_003',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Revenue & Order Trend Charts',
    'Test Scenario / Description': 'View weekly revenue bar charts, daily order volume area charts, and status distribution pie chart',
    'Preconditions': 'Historical orders in DB',
    'Test Steps': '1. Scroll to Analytics Charts\n2. Hover on chart points to view daily revenue tooltips',
    'Test Data / Payload': 'GET /analytics/weekly-trends',
    'Expected Result': 'Recharts renders responsive area/bar charts with accurate INR currency conversions',
    'Priority': 'Medium',
    'Test Type': 'UI/UX',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_004',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Geofencing Delivery Zones - Polygon Drawing',
    'Test Scenario / Description': 'Admin draws new polygon delivery zone on interactive map and assigns a Zone Manager',
    'Preconditions': 'Admin on Zones Panel',
    'Test Steps': '1. Click "Create Zone"\n2. Click 4 points on map to draw polygon boundary\n3. Name: "Central Zone"\n4. Select Zone Manager\n5. Save',
    'Test Data / Payload': 'POST /zones { name: "Central Zone", coordinates: [...] }',
    'Expected Result': 'GeoJSON polygon saved; renders with colored boundary; used by backend geospatial query',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_005',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Zone Base Fee & Surge Pricing Multiplier',
    'Test Scenario / Description': 'Configure zone delivery base fee (₹35 -> ₹50) and active rain/rush surge fee (+₹20)',
    'Preconditions': 'Zone selected for editing',
    'Test Steps': '1. Edit "Central Zone"\n2. Set Base Fee = ₹50, Surge Fee = ₹20\n3. Save Zone',
    'Test Data / Payload': 'PATCH /zones/:id { baseDeliveryFeeInPaise: 5000, surgeFeeInPaise: 2000 }',
    'Expected Result': 'All checkouts inside this zone automatically calculate ₹70 delivery fee in real-time',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_006',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Restaurant Review & Approval',
    'Test Scenario / Description': 'Review newly registered restaurant FSSAI/GST documents and approve store for public ordering',
    'Preconditions': 'Restaurant in "pending_approval" status',
    'Test Steps': '1. Go to "Restaurants"\n2. Filter "Pending Approval"\n3. Click "Review"\n4. Set Commission = 18%\n5. Click "Approve & Activate"',
    'Test Data / Payload': 'PATCH /restaurants/:id { isApproved: true, isActive: true }',
    'Expected Result': 'Restaurant status becomes "approved"; restaurant goes live on Customer App immediately',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_007',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Restaurant Custom Commission Override',
    'Test Scenario / Description': 'Override default platform commission (15%) with custom rate (18%) for premium restaurant',
    'Preconditions': 'Restaurant active',
    'Test Steps': '1. Edit Restaurant settings\n2. Set Commission Rate = 18% (0.18)\n3. Save',
    'Test Data / Payload': 'commissionPercentage: 0.18',
    'Expected Result': 'Subsequent orders from this restaurant deduct 18% platform take-rate in wallet ledger',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_008',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Restaurant Suspension / Deactivation',
    'Test Scenario / Description': 'Admin suspends restaurant due to hygiene/compliance violations',
    'Preconditions': 'Restaurant currently active',
    'Test Steps': '1. Open Restaurant details\n2. Click "Suspend / Deactivate"\n3. Confirm action',
    'Test Data / Payload': 'PATCH /restaurants/:id { isActive: false }',
    'Expected Result': 'Restaurant removed from customer search results; active carts cleared',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_009',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Live Fleet Operations Map',
    'Test Scenario / Description': 'View real-time GPS locations of all online delivery drivers across city on interactive map',
    'Preconditions': 'Drivers online with active GPS streaming',
    'Test Steps': '1. Open "Live Fleet Map"\n2. Observe live bike icons, battery %, and active delivery status',
    'Test Data / Payload': 'GET /drivers/admin/fleet, WebSocket: "driver:location_updated"',
    'Expected Result': 'Map visualizes full fleet distribution, active trip routes, and idle drivers in real-time',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_010',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Emergency Manual Driver Dispatch',
    'Test Scenario / Description': 'Admin manually overrides auto-dispatch and assigns specific driver to unassigned order',
    'Preconditions': 'Unassigned order in queue',
    'Test Steps': '1. Select unassigned Order #ORD-1005\n2. Click "Manual Assign"\n3. Select driver "Vikas Singh"\n4. Click "Dispatch"',
    'Test Data / Payload': 'PATCH /orders/:id/assign-driver { driverId }',
    'Expected Result': 'Order assigned to Vikas Singh; loud dispatch ringtone triggers on driver phone',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_011',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Categories & Cuisines Management',
    'Test Scenario / Description': 'Add new Food Category "Mughlai" with S3 icon upload and sort order',
    'Preconditions': 'Admin on Categories Panel',
    'Test Steps': '1. Click "Add Category"\n2. Title: "Mughlai", Upload icon.png\n3. Set Sort Order = 1\n4. Save',
    'Test Data / Payload': 'POST /categories (Multipart form-data)',
    'Expected Result': 'Category saved in DB; icon uploaded to S3; appears on Customer App home discovery grid',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_012',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Customer User Management & Account Blocking',
    'Test Scenario / Description': 'Search customer by phone/email, view order history, and toggle account block for fraud',
    'Preconditions': 'Customer registered in DB',
    'Test Steps': '1. Open "Customers"\n2. Search "+91 9876543210"\n3. Click "Block User"\n4. Confirm',
    'Test Data / Payload': 'PATCH /users/:id/block { isBlocked: true }',
    'Expected Result': 'User session terminated; customer blocked from placing new orders',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_013',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Driver KYC Document Review & Approval',
    'Test Scenario / Description': 'Review driver Driving License, Vehicle RC, and Aadhaar card; approve driver account',
    'Preconditions': 'Driver in "pending_kyc" status',
    'Test Steps': '1. Open "Delivery Agents"\n2. Filter "Pending KYC"\n3. Inspect uploaded documents\n4. Click "Approve Driver"',
    'Test Data / Payload': 'PATCH /drivers/:id/approve',
    'Expected Result': 'Driver status becomes "ACTIVE"; driver can now go Online to receive delivery orders',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_014',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Financial Settlements - Review Payout Requests',
    'Test Scenario / Description': 'Review pending vendor/driver withdrawal requests and verify bank account details',
    'Preconditions': 'Pending payout requests in DB',
    'Test Steps': '1. Open "Finance & Settlements"\n2. View pending withdrawal requests table\n3. Verify amount and IFSC',
    'Test Data / Payload': 'GET /wallets/admin/payout-requests',
    'Expected Result': 'Lists all pending payouts with vendor name, requested amount, bank details, and timestamp',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_015',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Approve & Settle Batch Bank Payouts',
    'Test Scenario / Description': 'Select 3 pending payout requests (totaling ₹18,500) and execute batch settlement',
    'Preconditions': 'Pending payout requests in DB',
    'Test Steps': '1. Check 3 requests in table\n2. Click "Approve & Settle Batch"\n3. Enter admin password\n4. Confirm',
    'Test Data / Payload': 'POST /wallets/admin/settle-batch { withdrawalIds: [...] }',
    'Expected Result': 'Payout requests marked "COMPLETED"; balance debited; transaction recorded in Admin Audit Ledger',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_016',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Promotions & Coupon Campaign Creator',
    'Test Scenario / Description': 'Create promo code "WEEKEND20" (20% OFF, min order ₹300, max discount ₹80, valid for 7 days)',
    'Preconditions': 'Admin on Promos Panel',
    'Test Steps': '1. Click "Create Campaign"\n2. Code: "WEEKEND20"\n3. Discount: 20%, Max ₹80, Min Order ₹300\n4. Set Dates\n5. Publish',
    'Test Data / Payload': 'POST /promotions { code: "WEEKEND20", discountPercentage: 20, maxDiscount: 8000 }',
    'Expected Result': 'Coupon saved in DB; immediately active and redeemable by customers on cart checkout',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_017',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Sub-Admin Role & Permission Management',
    'Test Scenario / Description': 'Create Sub-Admin (Zone Manager) with restricted permissions (Orders & Fleet only)',
    'Preconditions': 'Super Admin logged in',
    'Test Steps': '1. Go to "Sub-Admins"\n2. Click "Add Sub-Admin"\n3. Enable "Orders" & "Drivers"; Disable "Finance" & "Settings"\n4. Save',
    'Test Data / Payload': 'POST /sub-admins { name, email, permissions: ["orders", "drivers"] }',
    'Expected Result': 'Sub-Admin created; login restricts access strictly to allowed panels (403 Forbidden on Finance)',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_018',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Global System Settings & Maintenance Mode',
    'Test Scenario / Description': 'Update global delivery base fee (₹40 -> ₹50), tax % (5%), and test Maintenance Mode banner',
    'Preconditions': 'Admin on Settings Panel',
    'Test Steps': '1. Open "Admin Settings"\n2. Update Delivery Base Fee = ₹50\n3. Toggle "Maintenance Mode" to ON\n4. Save',
    'Test Data / Payload': 'PATCH /settings { deliveryBaseFee: 5000, isMaintenanceMode: true }',
    'Expected Result': 'Customer apps show maintenance banner and block new checkouts until toggled back to OFF',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_019',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Broadcast Push Notifications via Firebase FCM',
    'Test Scenario / Description': 'Send rich broadcast push notification to all customer devices with custom deep link',
    'Preconditions': 'Customers registered with FCM tokens',
    'Test Steps': '1. Go to "Communications"\n2. Target: "All Customers"\n3. Title: "Sunday Biryani Fest!", Body: "Flat 40% OFF today!"\n4. Send',
    'Test Data / Payload': 'POST /notifications/broadcast { title, body, deepLink: "/category/biryani" }',
    'Expected Result': 'FCM Multicast delivers notification to customer mobile devices within 3-5 seconds',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_ADMN_020',
    'Platform / App': 'Admin Web Panel',
    'Module / Feature': 'Admin Governance & Audit Activity Logs',
    'Test Scenario / Description': 'View chronological audit trail of all admin actions (restaurant approvals, commission changes, payouts)',
    'Preconditions': 'Admin actions performed',
    'Test Steps': '1. Open "Governance & Audit Logs"\n2. Filter by Action Type "RESTAURANT_COMMISSION_CHANGE"',
    'Test Data / Payload': 'GET /governance/logs',
    'Expected Result': 'Displays admin user, IP address, exact previous value, new value, and timestamp',
    'Priority': 'Medium',
    'Test Type': 'Security',
    'Status': 'Not Run'
  }
];

// ==========================================
// 5. EDGE CASES, CONCURRENCY & SECURITY - 27 TEST CASES
// ==========================================
const edgeCaseTestCases: TestCase[] = [
  {
    'Test Case ID': 'TC_EDGE_001',
    'Platform / App': 'Backend / Customer App',
    'Module / Feature': 'Idempotency & Double Click Prevention',
    'Test Scenario / Description': 'Customer rapidly taps "Place Order" 5 times within 1 second on slow network',
    'Preconditions': 'Checkout with idempotencyKey',
    'Test Steps': '1. Send 5 simultaneous checkout requests with identical idempotencyKey',
    'Test Data / Payload': 'POST /orders/checkout { idempotencyKey: "req-unique-uuid-1234" } x 5',
    'Expected Result': 'Only 1 single order created in DB; subsequent requests return existing order without double billing',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_002',
    'Platform / App': 'Backend / Payment Gateway',
    'Module / Feature': 'Payment Signature Tampering Attempt',
    'Test Scenario / Description': 'Attacker intercepts and sends fake razorpaySignature with modified amount or order ID',
    'Preconditions': 'Razorpay online payment initiated',
    'Test Steps': '1. Initiate payment\n2. Modify signature payload to fake hash\n3. Call confirm-payment',
    'Test Data / Payload': 'POST /orders/confirm-payment { razorpaySignature: "fake_hash_value" }',
    'Expected Result': 'Backend crypto HMAC verification fails; throws 400 BadRequestException "Invalid payment signature"; order NOT confirmed',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_003',
    'Platform / App': 'Payments & Webhooks',
    'Module / Feature': 'Webhook vs Client Callback Race Condition',
    'Test Scenario / Description': 'Customer force-closes app immediately after bank UPI approval before Flutter callback executes',
    'Preconditions': 'Razorpay webhook listener active on backend',
    'Test Steps': '1. Complete payment in GPay\n2. Immediately force close app process\n3. Webhook receives payment.captured',
    'Test Data / Payload': 'POST /payments/webhook { event: "payment.captured" }',
    'Expected Result': 'Backend webhook handler validates signature and confirms order independently, preventing lost orders',
    'Priority': 'High',
    'Test Type': 'Payment',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_004',
    'Platform / App': 'Payments & Checkout',
    'Module / Feature': 'Double Debit / Multi-Device Concurrency',
    'Test Scenario / Description': 'Customer opens same cart on Web and Mobile and clicks "Pay" at the exact same millisecond',
    'Preconditions': 'User logged into Web and Mobile with identical cart',
    'Test Steps': '1. Open checkout on Phone and Laptop\n2. Click "Pay" simultaneously on both devices',
    'Test Data / Payload': 'Simultaneous payment checkout on both sessions',
    'Expected Result': 'First session acquires transaction lock; second session rejected with "Transaction in progress"; customer charged only once',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_005',
    'Platform / App': 'Vendor & Financials',
    'Module / Feature': 'Vendor Concurrent Double-Withdrawal Attempt',
    'Test Scenario / Description': 'Vendor opens Wallet in 2 browser tabs and requests ₹5,000 withdrawal simultaneously on a ₹5,000 balance',
    'Preconditions': 'Vendor wallet balance = exactly ₹5,000',
    'Test Steps': '1. Open Wallet in Tab 1 and Tab 2\n2. Enter ₹5,000 in both tabs\n3. Click Submit simultaneously',
    'Test Data / Payload': 'Tab 1: ₹5,000; Tab 2: ₹5,000',
    'Expected Result': 'Atomic MongoDB balance condition { balance: { $gte: amount } } allows Tab 1; Tab 2 fails with 400 "Insufficient balance"',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_006',
    'Platform / App': 'Driver & Cash Management',
    'Module / Feature': 'Driver COD Cash-in-Hand Threshold Enforcement',
    'Test Scenario / Description': 'Driver collects ₹3,000 in COD cash, exceeding platform cash holding limit (₹2,500)',
    'Preconditions': 'maxDriverCashInHand = ₹2,500; Driver completes ₹800 COD delivery (Total = ₹2,800)',
    'Test Steps': '1. Driver marks COD order delivered\n2. System attempts auto-dispatching another COD order',
    'Test Data / Payload': 'Cash in hand = ₹2,800 (> ₹2,500)',
    'Expected Result': 'Dispatch engine excludes driver from receiving COD orders until cash is deposited with Admin',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_007',
    'Platform / App': 'Checkout & Taxes',
    'Module / Feature': 'Sub-Penny Floating-Point Rounding Discrepancy',
    'Test Scenario / Description': 'Complex bill calculation with odd pricing (₹99, ₹137), 18% GST, 5% tax, 15% commission, ₹43.50 fee, and 33% discount',
    'Preconditions': 'Cart with 3 items of odd pricing',
    'Test Steps': '1. Add items\n2. Apply 33% coupon\n3. Check backend calculation against Razorpay integer paise payload',
    'Test Data / Payload': 'Subtotal ₹449.00, Discount 33%, Taxes, Delivery',
    'Expected Result': 'All values stored as exact integer Paise (e.g. 35937 Paise) with 0 rounding mismatch',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_008',
    'Platform / App': 'Geofencing & Zones',
    'Module / Feature': 'Customer Location on Exact Polygon Boundary Border Line',
    'Test Scenario / Description': 'Customer GPS coordinates fall directly on the borderline vertex between Zone A and Zone B',
    'Preconditions': 'Zone A and Zone B share a border line',
    'Test Steps': '1. Set mock GPS to exact boundary coordinate\n2. Call GET /zones/locate',
    'Test Data / Payload': 'Customer Lat: 28.610000, Lng: 77.250000',
    'Expected Result': 'MongoDB 2dsphere $geoIntersects cleanly assigns nearest matching zone deterministically without 500 error',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_009',
    'Platform / App': 'Driver & Geofencing',
    'Module / Feature': 'Driver Mock Location / GPS Spoofing Detection',
    'Test Scenario / Description': 'Driver uses fake GPS app to teleport to restaurant to trigger false pickup check-in',
    'Preconditions': 'Driver on Android with Mock Locations enabled',
    'Test Steps': '1. Enable Mock Location\n2. Teleport location to restaurant\n3. Tap "Arrived at Restaurant"',
    'Test Data / Payload': 'isMockLocation telemetry check / >120 km/h speed anomaly',
    'Expected Result': 'App blocks fake arrival with alert "Mock location detected. Please disable fake GPS apps to continue"',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_010',
    'Platform / App': 'Driver & Location',
    'Module / Feature': 'Invalid GPS Coordinates Sanitization (0,0 / NaN / Out of Range)',
    'Test Scenario / Description': 'Driver GPS hardware glitch transmits Lat: 0.0, Lng: 0.0 (Null Island) or NaN',
    'Preconditions': 'Driver streaming location',
    'Test Steps': '1. Send invalid coordinates payload\n2. Observe customer tracking map',
    'Test Data / Payload': 'PATCH /drivers/:id/location { lat: 0.0, lng: 0.0 }',
    'Expected Result': 'class-validator DTO rejects invalid coordinates; last known valid location retained; map does not jump to ocean',
    'Priority': 'Medium',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_011',
    'Platform / App': 'Orders & Dispatch',
    'Module / Feature': 'Driver Simultaneous Acceptance Collision (Two Drivers Accept Same Order)',
    'Test Scenario / Description': 'Order dispatched to Driver A and Driver B in pool; both tap "Accept" at the exact same millisecond',
    'Preconditions': 'Order in READY_FOR_PICKUP with driverId = null',
    'Test Steps': '1. Driver 1 and Driver 2 tap Accept simultaneously',
    'Test Data / Payload': 'Atomic findOneAndUpdate({ _id: orderId, driverId: null }, ...)',
    'Expected Result': 'Driver 1 assigned successfully; Driver 2 receives clean 409 Conflict "Order was accepted by another driver"',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_012',
    'Platform / App': 'Orders & Dispatch',
    'Module / Feature': 'Vendor Cancels Order while Driver is En Route to Restaurant',
    'Test Scenario / Description': 'Vendor runs out of ingredients and cancels order after a driver has already accepted and is driving to restaurant',
    'Preconditions': 'Order in DRIVER_ASSIGNED; Driver 500m from restaurant',
    'Test Steps': '1. Vendor clicks "Cancel Order"\n2. Observe Driver screen',
    'Test Data / Payload': 'order:cancelled_by_vendor WebSocket event',
    'Expected Result': 'Driver navigation interrupted with cancellation popup; compensation credited; driver returned to available queue',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_013',
    'Platform / App': 'Orders & Lifecycle',
    'Module / Feature': 'Customer Cancels Order After Food is Already Prepared',
    'Test Scenario / Description': 'Customer attempts cancelling order when status is already "PREPARING" or "READY_FOR_PICKUP"',
    'Preconditions': 'Order status = "PREPARING"',
    'Test Steps': '1. Open active order\n2. Attempt clicking "Cancel Order"',
    'Test Data / Payload': 'Cancellation restriction check',
    'Expected Result': '"Cancel Order" button disabled with message "Food is being prepared and cannot be cancelled"; prevents vendor financial loss',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_014',
    'Platform / App': 'Menu & Checkout',
    'Module / Feature': 'Menu Price Change During Active Customer Checkout',
    'Test Scenario / Description': 'Restaurant owner updates dish price from ₹200 to ₹300 while customer is on checkout screen with old price ₹200',
    'Preconditions': 'Customer viewing checkout screen with old price',
    'Test Steps': '1. Vendor updates price in Menu Management\n2. Customer clicks "Place Order"',
    'Test Data / Payload': 'Old snapshot price: ₹200 vs DB live price: ₹300',
    'Expected Result': 'Backend checkout validates snapshot price against live DB; detects price discrepancy; prompts customer with updated bill',
    'Priority': 'High',
    'Test Type': 'Boundary',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_015',
    'Platform / App': 'Vendor & Cart Module',
    'Module / Feature': 'Item Becomes Out of Stock During Checkout Transaction',
    'Test Scenario / Description': 'Item in customer cart is marked Out of Stock by vendor seconds before customer clicks Pay',
    'Preconditions': 'Customer has "Special Thali" in cart',
    'Test Steps': '1. Vendor toggles item to Out of Stock\n2. Customer clicks "Place Order"',
    'Test Data / Payload': 'POST /orders/checkout',
    'Expected Result': 'Database transaction detects item isAvailable: false; aborts order creation; returns 400 "Special Thali is no longer available"',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_016',
    'Platform / App': 'Driver & Orders Ecosystem',
    'Module / Feature': 'Zero Online Drivers Available in Zone',
    'Test Scenario / Description': 'Customer places order in a delivery zone when all active drivers are offline or busy',
    'Preconditions': '0 drivers online in zone',
    'Test Steps': '1. Place order\n2. Auto-dispatch algorithm runs',
    'Test Data / Payload': 'POST /orders/:id/auto-assign',
    'Expected Result': 'Order transitions to "READY_FOR_PICKUP / UNASSIGNED"; alerts Admin live fleet dashboard with "Needs Manual Dispatch" badge',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_017',
    'Platform / App': 'WebSockets / Real-time',
    'Module / Feature': 'Network Drop & Automatic Socket Reconnection',
    'Test Scenario / Description': 'Customer turns on Airplane mode for 20s during delivery in elevator/tunnel and reconnects',
    'Preconditions': 'Active tracking screen open on mobile',
    'Test Steps': '1. Toggle Airplane Mode ON for 20s\n2. Vendor/Driver updates status to OUT_FOR_DELIVERY\n3. Toggle Airplane Mode OFF',
    'Test Data / Payload': 'Socket reconnect & GET /orders/:id fallback sync',
    'Expected Result': 'Socket.IO client triggers reconnection handshake; fetches latest order snapshot; tracking screen updates to latest state',
    'Priority': 'High',
    'Test Type': 'Real-time / WebSocket',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_018',
    'Platform / App': 'WebSockets & Network',
    'Module / Feature': 'Reconnection Storm / Thundering Herd Simulation',
    'Test Scenario / Description': 'Backend server restarts; 500 active mobile app clients attempt reconnecting simultaneously',
    'Preconditions': '500 active connected sockets across test devices',
    'Test Steps': '1. Drop WebSocket server connection\n2. Observe client reconnect intervals and server CPU load',
    'Test Data / Payload': 'Exponential backoff + jitter',
    'Expected Result': 'Clients apply exponential backoff + random jitter (1s, 2.5s, 5s, 10s); connection requests distribute evenly; server CPU remains stable',
    'Priority': 'High',
    'Test Type': 'Performance',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_019',
    'Platform / App': 'WebSockets & Network',
    'Module / Feature': 'Out-of-Order WebSocket Packet Arrival Handling',
    'Test Scenario / Description': 'Due to network latency, "DELIVERED" socket event reaches phone 100ms before delayed "OUT_FOR_DELIVERY" event',
    'Preconditions': 'Order being delivered',
    'Test Steps': '1. Send DELIVERED event first\n2. Send delayed OUT_FOR_DELIVERY event second',
    'Test Data / Payload': 'Packet 1: DELIVERED (t=10); Packet 2: OUT_FOR_DELIVERY (t=8)',
    'Expected Result': 'App state machine detects current state DELIVERED has higher ordinal rank; ignores stale event; UI remains on DELIVERED screen',
    'Priority': 'Medium',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_020',
    'Platform / App': 'Authentication & Security',
    'Module / Feature': 'Silent JWT Token Expiration During 45-Minute Live Tracking',
    'Test Scenario / Description': 'Customer watches live delivery map for 45 minutes; user JWT auth token expires mid-delivery',
    'Preconditions': 'accessToken lifespan = 30 minutes; Order delivery takes 40 minutes',
    'Test Steps': '1. Keep live tracking open past token expiration\n2. Socket / polling heartbeat triggers',
    'Test Data / Payload': 'Token expiration at minute 30',
    'Expected Result': 'HTTP Interceptor catches 401; uses refreshToken to silently obtain new accessToken in background; tracking map continues without login popup',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_021',
    'Platform / App': 'Promotions & Coupons',
    'Module / Feature': 'Single-Use Promo Code Multi-Device Race Condition Abuse',
    'Test Scenario / Description': 'Attacker logs into 5 devices with same account and clicks checkout with single-use promo "WELCOME100" simultaneously',
    'Preconditions': 'Promo code maxUsagePerUser = 1',
    'Test Steps': '1. Apply WELCOME100 on 5 devices\n2. Click "Place Order" at exact same millisecond',
    'Test Data / Payload': '5 concurrent checkout requests with code "WELCOME100"',
    'Expected Result': 'Atomic MongoDB $inc: { usedCount: 1 } ensures only 1 checkout succeeds with discount; remaining 4 fail with "Coupon already used"',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_022',
    'Platform / App': 'Authentication & DDoS',
    'Module / Feature': 'SMS OTP Rate Limiting & Gateway Exhaustion Protection',
    'Test Scenario / Description': 'Attacker writes script spamming POST /auth/send-otp 100 times in 10 seconds to exhaust SMS balance',
    'Preconditions': 'ThrottlerModule active in Backend',
    'Test Steps': '1. Send rapid loop of OTP requests to same phone number\n2. Observe response codes',
    'Test Data / Payload': '100 requests to /auth/send-otp in 5 seconds',
    'Expected Result': 'First 3 requests succeed; 4th request onwards blocked with HTTP 429 "Too Many Requests. Please wait 60s"; SMS credits protected',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_023',
    'Platform / App': 'Backend & Security',
    'Module / Feature': 'NoSQL Operator Injection in Search & Filter Endpoints',
    'Test Scenario / Description': 'Attacker sends malicious JSON payload { "$gt": "" } or { "$ne": null } in query params to bypass filters',
    'Preconditions': 'Endpoint: GET /restaurants?name[$ne]=null',
    'Test Steps': '1. Send NoSQL operator payload in URL query params\n2. Inspect backend MongoDB query execution',
    'Test Data / Payload': 'URL: /search?q[$ne]=null&rating[$gt]=0',
    'Expected Result': 'NestJS ValidationPipe with whitelist: true treats operators as literal strings or strips non-whitelisted properties; query executes safely',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_024',
    'Platform / App': 'Uploads & Security',
    'Module / Feature': 'Malicious File Upload & MIME Type Validation (.php, .exe, .sh)',
    'Test Scenario / Description': 'Attacker attempts uploading executable script disguised as dish image',
    'Preconditions': 'Image upload form open',
    'Test Steps': '1. Rename "exploit.php" to "exploit.php.jpg" with executable payload\n2. Upload file',
    'Test Data / Payload': 'File: exploit.php.jpg',
    'Expected Result': 'Multer & S3 validator checks file magic bytes and MIME type; rejects upload with 400 "Invalid file type. Only JPEG, PNG, WEBP allowed up to 5MB"',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_025',
    'Platform / App': 'Authorization & Security',
    'Module / Feature': 'Insecure Direct Object References (IDOR) - Orders & Wallets',
    'Test Scenario / Description': 'Customer A attempts to fetch or update Customer B order or driver wallet by changing ID in API request',
    'Preconditions': 'Customer A logged in (userId: user_A); Order belongs to user_B',
    'Test Steps': '1. Log in as Customer A\n2. Send GET /orders/orderId_of_User_B\n3. Send GET /wallets/driver/driver_B_id',
    'Test Data / Payload': 'Cross-user ID in URL',
    'Expected Result': 'Backend checks ownership against currentUser._id; returns 403 Forbidden with message "You are not authorized"; zero data leakage',
    'Priority': 'High',
    'Test Type': 'Security',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_026',
    'Platform / App': 'Fleet & Dispatch',
    'Module / Feature': 'Driver Vehicle Breakdown / Mid-Route Handover to Driver B',
    'Test Scenario / Description': 'Driver motorbike has a flat tire while carrying hot food to customer',
    'Preconditions': 'Order in OUT_FOR_DELIVERY with Driver A',
    'Test Steps': '1. Admin opens Live Fleet\n2. Selects Order #ORD-1005\n3. Clicks "Emergency Reassign"\n4. Selects Driver B\n5. Confirms handover',
    'Test Data / Payload': 'PATCH /orders/:id/assign-driver { driverId: driverB }',
    'Expected Result': 'Driver A released; Driver B receives pickup location at Driver A GPS coordinates; Customer live map seamlessly switches bike icon to Driver B',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  },
  {
    'Test Case ID': 'TC_EDGE_027',
    'Platform / App': 'Driver & COD Delivery',
    'Module / Feature': 'Customer Phone Dead / Unreachable on COD Delivery',
    'Test Scenario / Description': 'Driver reaches customer building with COD order; customer phone is off and doorbell unanswered',
    'Preconditions': 'Driver at drop location with COD order',
    'Test Steps': '1. Driver taps "Customer Unreachable"\n2. 5-minute countdown starts with automated SMS/Push prompts\n3. After timer expires, Driver clicks "Mark Undeliverable"',
    'Test Data / Payload': 'Customer unreachable workflow',
    'Expected Result': 'Order marked "UNDELIVERED / RETURNED_TO_RESTAURANT"; return compensation credited to driver wallet; customer flagged for uncollected COD',
    'Priority': 'High',
    'Test Type': 'Functional',
    'Status': 'Not Run'
  }
];

// Combine all 117 test cases
const allTestCases: TestCase[] = [
  ...customerTestCases,
  ...vendorTestCases,
  ...driverTestCases,
  ...adminTestCases,
  ...edgeCaseTestCases,
];

// Summary Sheet Data
const summaryData = [
  { 'Platform / Category': '📱 Customer App (Flutter)', 'Total Test Cases': customerTestCases.length, 'Key Areas Covered': 'Auth & OTP, Address Book, Home Feed, Menu & Add-ons, Cart, COD & Razorpay Checkout, Live GPS Tracking, Invoices, Reviews' },
  { 'Platform / Category': '🏪 Vendor Web Panel', 'Total Test Cases': vendorTestCases.length, 'Key Areas Covered': 'Vendor Login, Audio Chimes, Order Acceptance & Prep Time, Ready for Pickup, Menu CRUD & S3 Uploads, Stock & Store Duty, Wallet Payouts' },
  { 'Platform / Category': '🛵 Delivery Driver App', 'Total Test Cases': driverTestCases.length, 'Key Areas Covered': 'Driver Duty Toggle, 30s Dispatch Modal, Turn-by-Turn Navigation, Pickup Verification, Background GPS Stream, COD Cash, Earnings' },
  { 'Platform / Category': '💻 Admin Web Panel', 'Total Test Cases': adminTestCases.length, 'Key Areas Covered': 'Global Analytics, Polygon Geofencing, Restaurant Approval & Commission, Fleet Map & Manual Dispatch, Batch Settlements, Settings' },
  { 'Platform / Category': '⚡ Edge Cases & Security', 'Total Test Cases': edgeCaseTestCases.length, 'Key Areas Covered': 'Idempotency, HMAC Tampering, Webhook Races, Zero Drivers, GPS Spoofing, Single-use Promo Abuse, IDOR, Breakdown Handover' },
  { 'Platform / Category': '--------------------------------', 'Total Test Cases': '', 'Key Areas Covered': '' },
  { 'Platform / Category': 'TOTAL TEST CASES', 'Total Test Cases': allTestCases.length, 'Key Areas Covered': 'Complete End-to-End Rasikae Food Delivery Ecosystem Master Testing Suite' },
  { 'Platform / Category': 'STATUS FIELD OPTIONS', 'Total Test Cases': '4 Allowed Options', 'Key Areas Covered': 'Not Run (Initial Default) | Run | Hold | Not Required' }
];

// Create Workbook
const wb = XLSX.utils.book_new();

// Add Sheets
const wsSummary = XLSX.utils.json_to_sheet(summaryData);
const wsAll = XLSX.utils.json_to_sheet(allTestCases);
const wsCustomer = XLSX.utils.json_to_sheet(customerTestCases);
const wsVendor = XLSX.utils.json_to_sheet(vendorTestCases);
const wsDriver = XLSX.utils.json_to_sheet(driverTestCases);
const wsAdmin = XLSX.utils.json_to_sheet(adminTestCases);
const wsEdge = XLSX.utils.json_to_sheet(edgeCaseTestCases);

// Set column widths for clean readability
const colWidths = [
  { wch: 15 }, // Test Case ID
  { wch: 24 }, // Platform / App
  { wch: 25 }, // Module / Feature
  { wch: 45 }, // Test Scenario
  { wch: 30 }, // Preconditions
  { wch: 45 }, // Test Steps
  { wch: 40 }, // Test Data
  { wch: 45 }, // Expected Result
  { wch: 10 }, // Priority
  { wch: 22 }, // Test Type
  { wch: 16 }, // Status
];

[wsAll, wsCustomer, wsVendor, wsDriver, wsAdmin, wsEdge].forEach(ws => {
  ws['!cols'] = colWidths;
});

wsSummary['!cols'] = [
  { wch: 32 },
  { wch: 18 },
  { wch: 75 }
];

XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Dashboard');
XLSX.utils.book_append_sheet(wb, wsAll, 'All Test Cases');
XLSX.utils.book_append_sheet(wb, wsCustomer, 'Customer App (Flutter)');
XLSX.utils.book_append_sheet(wb, wsVendor, 'Vendor Panel');
XLSX.utils.book_append_sheet(wb, wsDriver, 'Driver App');
XLSX.utils.book_append_sheet(wb, wsAdmin, 'Admin Panel');
XLSX.utils.book_append_sheet(wb, wsEdge, 'Edge Cases & Security');

// Write out XLSX in the root project directory and backend directory
const rootXlsxPath = path.resolve(__dirname, '../../..', 'Rasikae_Complete_Ecosystem_Test_Cases.xlsx');
const rootCsvPath = path.resolve(__dirname, '../../..', 'Rasikae_Complete_Ecosystem_Test_Cases.csv');

XLSX.writeFile(wb, rootXlsxPath);
const csvContent = XLSX.utils.sheet_to_csv(wsAll);
fs.writeFileSync(rootCsvPath, csvContent, 'utf8');

// Also update master files for compatibility
const masterXlsxPath = path.resolve(__dirname, '../../..', 'Rasikae_Master_QA_Test_Suite.xlsx');
const masterCsvPath = path.resolve(__dirname, '../../..', 'Rasikae_Master_QA_Test_Cases.csv');
XLSX.writeFile(wb, masterXlsxPath);
fs.writeFileSync(masterCsvPath, csvContent, 'utf8');

console.log('====================================================');
console.log('✅ Generated Excel Test Cases File at:', rootXlsxPath);
console.log('✅ Generated CSV Test Cases File at:', rootCsvPath);
console.log('📊 Total Test Cases across all tabs:', allTestCases.length);
console.log('🚦 Status Field Options: Not Run | Run | Hold | Not Required');
console.log('====================================================');

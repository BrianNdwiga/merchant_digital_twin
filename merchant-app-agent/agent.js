// Merchant App Agent
// Simulates a merchant requesting payment from a customer via the M-PESA Business app.
// Uses Appium (local or BrowserStack) for real device automation.
// Falls back to behavioral simulation if no Appium credentials are configured.

const APP_PACKAGE = 'ke.safaricom.mpesa.business.uat';

const BROWSERSTACK_USER = process.env.BROWSERSTACK_USER;
const BROWSERSTACK_KEY  = process.env.BROWSERSTACK_KEY;
const APP_URL           = process.env.APP_URL;
const USE_LOCAL_APPIUM  = process.env.USE_LOCAL_APPIUM === 'true';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const NETWORK_LATENCY = {
  '4G_GOOD':     100,
  '4G_UNSTABLE': 300,
  '3G_POOR':     800,
  '2G_EDGE':    1500
};

const INTERACTION_DELAYS = {
  basic:        { tap: 2000, read: 3000, pin: 4000 },
  intermediate: { tap: 1000, read: 1500, pin: 2000 },
  advanced:     { tap:  400, read:  800, pin:  800 }
};

const DEVICE_MAP = {
  android_low_end: 'Samsung Galaxy A13',
  android_mid:     'Samsung Galaxy S22',
  ios:             'iPhone 14'
};

const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL;

async function sendEvent(merchant, eventName, extra = {}) {
  if (!INSIGHT_SERVICE_URL) return;
  try {
    await fetch(`${INSIGHT_SERVICE_URL}/simulation-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId:      merchant.merchantId,
        scenarioId:      merchant.scenarioId || 'merchant-app-sim',
        event:           eventName,
        channel:         'APP',
        userType:        'merchant',
        timestamp:       Date.now(),
        networkProfile:  merchant.network_profile,
        digitalLiteracy: merchant.digital_literacy,
        deviceType:      merchant.device_type,
        paymentMethod:   merchant.payment_method,
        ...extra
      })
    });
  } catch (err) {
    console.error(`⚠️  Could not send event ${eventName}:`, err.message);
  }
}

async function simulateNetworkDelay(networkProfile) {
  const base   = NETWORK_LATENCY[networkProfile] || 500;
  const jitter = base * (Math.random() * 0.4 - 0.2);
  await sleep(Math.round(base + jitter));
  return Math.round(base + jitter);
}

function getDelays(literacy) {
  return INTERACTION_DELAYS[literacy] || INTERACTION_DELAYS.intermediate;
}

function getMerchant() {
  const raw = process.env.MERCHANT_APP_PROFILE;
  if (!raw) { console.error('ERROR: MERCHANT_APP_PROFILE not set'); process.exit(1); }
  try { return JSON.parse(raw); }
  catch (e) { console.error('ERROR: Bad MERCHANT_APP_PROFILE JSON:', e.message); process.exit(1); }
}

async function createDriver(merchant) {
  const { remote } = require('webdriverio');
  const isLocal = USE_LOCAL_APPIUM || !BROWSERSTACK_USER || !BROWSERSTACK_KEY;

  if (isLocal) {
    return remote({
      hostname: 'host.docker.internal',
      port: 4723,
      protocol: 'http',
      path: '/',
      connectionRetryTimeout: 60000,
      connectionRetryCount: 1,
      capabilities: {
        platformName:            'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName':     process.env.APPIUM_DEVICE_NAME || 'emulator-5554',
        'appium:appPackage':     APP_PACKAGE,
        'appium:appActivity':    'com.mpesa.splash.SplashActivity',
        'appium:noReset':        true
      }
    });
  }

  return remote({
    hostname: 'hub.browserstack.com',
    port: 443,
    protocol: 'https',
    path: '/wd/hub',
    connectionRetryTimeout: 60000,
    connectionRetryCount: 1,
    capabilities: {
      platformName:            'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:app':            APP_URL,
      'bstack:options': {
        userName:      BROWSERSTACK_USER,
        accessKey:     BROWSERSTACK_KEY,
        deviceName:    DEVICE_MAP[merchant.device_type] || 'Samsung Galaxy S22',
        osVersion:     '12.0',
        appiumVersion: '2.0.0',
        sessionName:   `Merchant ${merchant.merchantId} - App Sim`
      }
    }
  });
}

async function runPaymentSimulation(merchant, driver) {
  const delays    = getDelays(merchant.digital_literacy);
  const startTime = Date.now();
  let   step      = 0;

  // Step 1: App open
  step++;
  console.log(`📱 Step ${step}: Opening app`);
  await simulateNetworkDelay(merchant.network_profile);
  const appLoadMs = merchant.device_type === 'android_low_end'
    ? 3000 + Math.random() * 2000
    : 1000 + Math.random() * 500;
  await sleep(appLoadMs);
  await sendEvent(merchant, 'APP_OPEN', { appLoadMs: Math.round(appLoadMs) });
  console.log(`   ✓ App opened (${Math.round(appLoadMs)}ms)`);

  // Step 2: Navigate to payment screen
  step++;
  console.log(`📱 Step ${step}: Navigating to payment screen`);
  await sleep(delays.read);

  if (driver) {
    try {
      try { await driver.terminateApp(APP_PACKAGE); } catch { /* ignore */ }
      await sleep(1500);
      await driver.activateApp(APP_PACKAGE);
      await sleep(3000);

      try {
        const closeBtn = await driver.$(`id:${APP_PACKAGE}:id/closeButton`);
        if (await closeBtn.isDisplayed()) { await closeBtn.click(); await sleep(500); }
      } catch { /* no popup */ }

      const transactTab = await driver.$(`id:${APP_PACKAGE}:id/bottomNavigationTransactions`);
      await transactTab.click(); await sleep(delays.tap);

      const requestPaymentBtn = await driver.$(`//android.widget.FrameLayout[@clickable="true"][.//android.widget.TextView[@text="REQUEST PAYMENT"]]`);
      await requestPaymentBtn.click(); await sleep(delays.tap);

      const requestRow = await driver.$(`id:${APP_PACKAGE}:id/transactionLayoutContainer`);
      await requestRow.click(); await sleep(delays.tap);

      const fromCustomerBtn = await driver.$(`//android.view.ViewGroup[@clickable="true"][.//android.widget.TextView[@text="REQUEST PAYMENT FROM CUSTOMER"]]`);
      await fromCustomerBtn.click(); await sleep(delays.tap);

      const phoneField = await driver.$(`id:${APP_PACKAGE}:id/inputEditText`);
      await phoneField.click(); await sleep(500);
      await phoneField.setValue(merchant.phone || '254712510792'); await sleep(delays.tap);

      const continueBtn = await driver.$(`id:${APP_PACKAGE}:id/submitButton`);
      await continueBtn.click(); await sleep(delays.tap);

      const amount = String(merchant.installment_amount || 50);
      for (const digit of amount) {
        const cell = await driver.$(`id:${APP_PACKAGE}:id/cell${digit}`);
        await cell.click(); await sleep(300);
      }

      const amountContinueBtn = await driver.$(`id:${APP_PACKAGE}:id/continueButton`);
      await amountContinueBtn.click(); await sleep(delays.tap);
    } catch (e) {
      console.error(`   ❌ Navigation error: ${e.message}`);
      await sendEvent(merchant, 'NAVIGATION_CONFUSION', { step: 'find_payment', error: e.message });
    }
  } else {
    await sleep(delays.tap);
  }

  await sendEvent(merchant, 'PAYMENT_SCREEN_REACHED');

  // Step 3: STK push sent
  step++;
  console.log(`📱 Step ${step}: STK push sent to customer phone`);
  await simulateNetworkDelay(merchant.network_profile);
  await sendEvent(merchant, 'PAYMENT_INITIATED', {
    amount: merchant.installment_amount,
    paymentMethod: merchant.payment_method,
    loanBalance: merchant.loan_balance
  });

  // Step 4: Wait for customer PIN
  step++;
  console.log(`📱 Step ${step}: Waiting for customer to enter PIN...`);
  const stkDelay = (NETWORK_LATENCY[merchant.network_profile] || 500) * 2;
  await sleep(stkDelay);

  const stkTimedOut = merchant.network_profile === '2G_EDGE' && Math.random() < 0.25;
  if (stkTimedOut) {
    await sendEvent(merchant, 'STK_TIMEOUT', { waitedMs: stkDelay });
    if (merchant.patience_score < 0.4) throw new Error('Merchant abandoned — STK timeout, low patience');
    await sendEvent(merchant, 'RETRY_ATTEMPTED', { reason: 'stk_timeout' });
    await sleep(stkDelay);
  }

  await sendEvent(merchant, 'PAYMENT_PROMPT_RECEIVED', { method: merchant.payment_method });

  // Step 5: Confirmation
  step++;
  console.log(`📱 Step ${step}: Awaiting payment confirmation`);
  await simulateNetworkDelay(merchant.network_profile);

  const failChance = merchant.missed_payments >= 2 ? 0.3 : merchant.missed_payments === 1 ? 0.1 : 0.05;
  if (Math.random() < failChance) {
    throw new Error(`Payment failed — account status issue (${merchant.missed_payments} missed payments)`);
  }

  const completionMs = Date.now() - startTime;
  await sendEvent(merchant, 'PAYMENT_CONFIRMED', {
    amount: merchant.installment_amount,
    completionMs,
    newBalance: merchant.loan_balance - merchant.installment_amount
  });

  return { success: true, completionMs, step };
}

async function main() {
  const merchant = getMerchant();

  console.log(`\n🤖 Merchant App Agent: ${merchant.merchantId}`);
  console.log(`📱 Device: ${merchant.device_type} | 📡 Network: ${merchant.network_profile}`);
  console.log(`💡 Literacy: ${merchant.digital_literacy} | 💳 Method: ${merchant.payment_method}`);
  console.log(`💰 Balance: KES ${merchant.loan_balance} | Due in: ${merchant.days_until_due} days`);
  console.log(`⚠️  Missed payments: ${merchant.missed_payments}\n`);

  const startTime = Date.now();
  let driver = null;

  try {
    if (USE_LOCAL_APPIUM || BROWSERSTACK_USER) {
      console.log(USE_LOCAL_APPIUM ? '🔌 Connecting to local Appium...' : '🔌 Connecting to BrowserStack...');
      try {
        driver = await createDriver(merchant);
        console.log('✅ Appium session started\n');
      } catch (bsError) {
        console.log(`⚠️  Appium connection failed: ${bsError.message}`);
        console.log('ℹ️  Falling back to behavioral simulation only\n');
        driver = null;
      }
    } else {
      console.log('ℹ️  No Appium credentials — running behavioral simulation only\n');
    }

    const result = await runPaymentSimulation(merchant, driver);

    await sendEvent(merchant, 'ONBOARDING_SUMMARY', {
      summary: {
        merchantId:       merchant.merchantId,
        success:          true,
        completionTimeMs: result.completionMs,
        stepsCompleted:   result.step,
        channel:          'APP',
        userType:         'merchant',
        networkProfile:   merchant.network_profile,
        digitalLiteracy:  merchant.digital_literacy,
        deviceType:       merchant.device_type,
        paymentMethod:    merchant.payment_method,
        missedPayments:   merchant.missed_payments,
        outcome:          '✅ PAYMENT COMPLETED'
      }
    });

    console.log(`\n✅ Payment simulation complete for ${merchant.merchantId}`);

  } catch (err) {
    const failMs = Date.now() - startTime;
    console.error(`\n❌ Payment failed: ${err.message}`);

    await sendEvent(merchant, 'ONBOARDING_SUMMARY', {
      summary: {
        merchantId:        merchant.merchantId,
        success:           false,
        error:             err.message,
        timeBeforeFailure: failMs,
        channel:           'APP',
        userType:          'merchant',
        networkProfile:    merchant.network_profile,
        digitalLiteracy:   merchant.digital_literacy,
        deviceType:        merchant.device_type,
        paymentMethod:     merchant.payment_method,
        missedPayments:    merchant.missed_payments,
        outcome:           '❌ PAYMENT FAILED'
      }
    });

  } finally {
    if (driver) {
      await driver.deleteSession();
      console.log('🧹 Appium session closed');
    }
    process.exit(0);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

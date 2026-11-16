// ========================================
// 1. HTML 요소 가져오기
// ========================================

const fromCurrencySelect = document.getElementById("from-currency");
const toCurrencySelect = document.getElementById("to-currency");

const amountInput = document.getElementById("amount");
const resultText = document.getElementById("result");

const convertButton = document.getElementById("convert");
const langSelect = document.getElementById("lang-select");


// ========================================
// 2. 기본 설정
// ========================================

// 최대 입력 가능 금액: 9999해
const MAX_AMOUNT = 9.999e23;

// HTML 입력창에도 최댓값 적용
amountInput.min = "0";
amountInput.max = String(MAX_AMOUNT);
amountInput.step = "any";

// 브라우저 언어에 따라 기본 언어 설정
let currentLanguage = navigator.language.toLowerCase().startsWith("ko")
  ? "ko"
  : "en";

// 통화 데이터
let currencyData = [];

// 최초 통화 선택창 렌더링 여부
let isFirstRender = true;

// 환율 요청 번호
let requestId = 0;


// ========================================
// 3. 다국어 번역 데이터
// ========================================

const translations = {
  ko: {
    title: "환율 계산기",
    header: "💱 환율 계산기",

    amount: "가격",
    fromCurrency: "원래 단위(화폐)",
    toCurrency: "바꿀 단위(화폐)",

    button: "계산하기",

    result: "환율 계산 결과:",

    placeholder: "금액을 입력해 주세요.",

    invalid: "올바른 금액을 입력해 주세요.",

    maxError: "최대 입력 가능 금액은 9999해입니다.",

    loading: "환율을 불러오는 중입니다.",

    error: "환율 정보를 가져오는 과정에서 오류가 발생했습니다. 다시 시도해 주세요.",

    date: "기준일"
  },

  en: {
    title: "Exchange Rate Calculator",
    header: "💱 Exchange Rate Calculator",

    amount: "Amount",
    fromCurrency: "From",
    toCurrency: "To",

    button: "Convert",

    result: "Conversion result:",

    placeholder: "Please enter an amount.",

    invalid: "Please enter a valid amount.",

    maxError: "The maximum amount is 9999 Hae.",

    loading: "Loading exchange rate...",

    error: "An error occurred while retrieving exchange rate. Please try again.",

    date: "Date"
  }
};


// 현재 언어의 번역 가져오기
function t(key) {
  return translations[currentLanguage][key];
}


// ========================================
// 4. 화면의 언어 변경
// ========================================

function updateContent() {

  document.documentElement.lang = currentLanguage;

  document.title = t("title");

  document.querySelector(".header p").textContent =
    t("header");

  document.querySelector('label[for="amount"]').textContent =
    t("amount");

  document.querySelector('label[for="from-currency"]').textContent =
    t("fromCurrency");

  document.querySelector('label[for="to-currency"]').textContent =
    t("toCurrency");

  amountInput.placeholder = t("placeholder");

  convertButton.textContent = t("button");

  // 현재 언어를 선택창에 표시
  langSelect.value = currentLanguage;

  resultText.textContent = t("result");
}


// ========================================
// 5. 언어 선택창 이벤트
// ========================================

langSelect.addEventListener("change", () => {

  currentLanguage = langSelect.value;

  // 화면의 언어 변경
  updateContent();

  // 통화 데이터가 준비된 경우
  if (currencyData.length > 0) {

    // 통화 선택창의 언어 변경
    renderCurrencyOptions();

    // 환율 다시 계산
    updateExchangeRate();
  }
});


// ========================================
// 6. 숫자를 만, 억, 조, 경, 해 단위로 표시
// ========================================

function displayDeposit(target) {

  const unitWords = [
    "", "만", "억", "조", "경", "해",
    "자", "양", "구", "간", "정", "재", "극"
  ];

  if (!Number.isFinite(target)) {
    return "";
  }

  const rounded = Math.round(Math.abs(target) * 100) / 100;

  let remaining = Math.floor(rounded);

  const decimalPart =
    (rounded - remaining).toFixed(2).slice(1);

  let resultArray = [];

  // 큰 단위부터 계산
  for (let i = unitWords.length - 1; i >= 0; i--) {

    const unit = Math.pow(10000, i);

    const unitValue = Math.floor(remaining / unit);

    if (unitValue > 0) {

      resultArray.push(
        unitValue.toLocaleString("ko-KR") + unitWords[i]
      );

      remaining -= unitValue * unit;
    }
  }

  // 나머지 숫자 표시
  if (remaining > 0) {

    resultArray.push(
      remaining.toLocaleString("ko-KR")
    );

  }

  // 0인 경우
  if (resultArray.length === 0) {
    resultArray.push("0");
  }

  return (target < 0 ? "-" : "") +
    resultArray.join(" ") +
    decimalPart;
}


// ========================================
// 7. 숫자 표시 형식
// ========================================

function formatAmount(number) {

  // 한국어 모드에서 1만 이상이면 단위 표시
  if (currentLanguage === "ko" && number >= 10000) {

    return displayDeposit(number);

  }

  const locale = currentLanguage === "ko"
    ? "ko-KR"
    : "en-US";

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
}


// ========================================
// 8. 특수 통화 이름
// ========================================

const specialCases = {

  CNH: {
    ko: "중화인민공화국 국외용 위안(CNY와 같음.)",
    en: "China Overseas Yuan"
  },

  CYP: {
    ko: "키프로스 파운드",
    en: "Cypriot pound"
  },

  DEM: {
    ko: "독일 마르크",
    en: "German mark"
  },

  ECS: {
    ko: "eSync Network(암호화폐)",
    en: "eSync Network (cryptocurrency)"
  },

  FRF: {
    ko: "프랑스 프랑",
    en: "French franc"
  },

  IEP: {
    ko: "아일랜드 파운드",
    en: "Irish pound"
  },

  ITL: {
    ko: "이탈리아 리라",
    en: "Italian lira"
  },

  LTL: {
    ko: "리투아니아 리타",
    en: "Lithuania Rita"
  },

  LVL: {
    ko: "라트비아 라트",
    en: "Latvian Lat"
  },

  MGA: {
    ko: "마다가스카르 아리아리",
    en: "Madagascar Ariari"
  },

  MRO: {
    ko: "모리타니 우기야",
    en: "Mauritania Ugiya"
  },

  SIT: {
    ko: "슬로베니아 톨라르",
    en: "Slovenian Tolar"
  },

  XCP: {
    ko: "Counterparty(암호화폐)",
    en: "Counterparty (cryptocurrency)"
  },

  BRX: {
    ko: "Breakout Stake(암호화폐)",
    en: "Breakout Stake (cryptocurrency)"
  },

  HUX: {
    ko: "high X(암호화폐)",
    en: "high X (cryptocurrency)"
  },

  CNY: {
    ko: "중화인민공화국 위안",
    en: "Renminbi (Chinese) yuan"
  },

  STD: {
    ko: "상투메 프린시페 도브라",
    en: "Sao Tome Principe Dobra"
  },

  PHP: {
    ko: "필리핀 페소",
    en: "Philippine peso"
  }
};


// ========================================
// 9. 통화 옵션 생성
// ========================================

function createOptions(data) {

  return data.map(item => {

    // 통화 코드 추출
    const symbol = String(item.symbol || "").replace("=X", "");

    const value = symbol.includes("/")
      ? symbol.split("/").pop()
      : symbol;

    // 특수 통화 여부 확인
    const specialCase = specialCases[value];

    let name;

    if (specialCase) {

      name = specialCase[currentLanguage];

    } else {

      name = currentLanguage === "ko"
        ? item.kr
        : item.en;

    }

    return {
      value: value,
      text: `${name || value} (${value})`
    };

  }).filter(option => option.value);
}


// ========================================
// 10. 통화 선택창 렌더링
// ========================================

function renderCurrencyOptions() {

  // 기존에 선택한 통화 기억
  const previousFromValue = fromCurrencySelect.value;
  const previousToValue = toCurrencySelect.value;

  // 통화 옵션 생성
  const options = createOptions(currencyData);

  // 중복 통화 제거
  const uniqueOptions = [
    ...new Map(
      options.map(option => [option.value, option])
    ).values()
  ];

  // USD가 없으면 추가
  if (!uniqueOptions.some(option => option.value === "USD")) {

    uniqueOptions.push({
      value: "USD",
      text: currentLanguage === "ko"
        ? "미국 달러 (USD)"
        : "US Dollar (USD)"
    });

  }

  // KRW가 없으면 추가
  if (!uniqueOptions.some(option => option.value === "KRW")) {

    uniqueOptions.push({
      value: "KRW",
      text: currentLanguage === "ko"
        ? "대한민국 원 (KRW)"
        : "South Korean Won (KRW)"
    });

  }

  // 이름순 정렬
  uniqueOptions.sort((a, b) => {

    return a.text.localeCompare(
      b.text,

      currentLanguage === "ko"
        ? "ko-KR"
        : "en-US",

      { sensitivity: "base" }
    );

  });

  // 기존 옵션 삭제
  fromCurrencySelect.innerHTML = "";
  toCurrencySelect.innerHTML = "";

  // 새로운 옵션 추가
  uniqueOptions.forEach(option => {

    const fromOption = document.createElement("option");
    const toOption = document.createElement("option");

    fromOption.value = option.value;
    fromOption.textContent = option.text;

    toOption.value = option.value;
    toOption.textContent = option.text;

    fromCurrencySelect.appendChild(fromOption);
    toCurrencySelect.appendChild(toOption);

  });


  // 최초 실행
  if (isFirstRender) {

    fromCurrencySelect.value = "USD";
    toCurrencySelect.value = "KRW";

    isFirstRender = false;

  } else {

    // 기존에 선택했던 통화 유지
    fromCurrencySelect.value =
      previousFromValue || "USD";

    toCurrencySelect.value =
      previousToValue || "KRW";

  }
}


// ========================================
// 11. 환율 계산
// ========================================

async function updateExchangeRate() {

  // 새 요청 번호 발급
  const currentRequestId = ++requestId;

  // 입력값 가져오기
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;

  const rawAmount = amountInput.value.trim();

  const amount = Number(rawAmount);


  // 금액 유효성 검사
  if (
    rawAmount === "" ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {

    resultText.textContent =
      `${t("result")} ${t("invalid")}`;

    return;
  }


  // 최대 입력 금액 검사
  if (amount > MAX_AMOUNT) {

    resultText.textContent =
      `${t("result")} ${t("maxError")}`;

    return;
  }


  // 같은 통화를 선택한 경우
  if (fromCurrency === toCurrency) {

    resultText.textContent =
      `${t("result")} ${formatAmount(amount)} ${fromCurrency} = ${formatAmount(amount)} ${toCurrency}`;

    return;
  }


  // 로딩 표시
  resultText.textContent = t("loading");


  // API 주소
  const url =
    `https://api.manana.kr/exchange/rate.json?base=${encodeURIComponent(toCurrency)}&code=${encodeURIComponent(fromCurrency)}`;


  try {

    // 환율 데이터 요청
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();


    // 데이터 확인
    if (
      !Array.isArray(data) ||
      !data[0] ||
      !Number.isFinite(Number(data[0].rate))
    ) {

      throw new Error("Invalid exchange rate data");

    }


    // 새로운 요청이 시작되었다면 이전 결과 무시
    if (currentRequestId !== requestId) {
      return;
    }


    // 환율 가져오기
    const exchangeRate = Number(data[0].rate);

    if (exchangeRate <= 0) {
      throw new Error("Invalid exchange rate");
    }

    // 환전된 금액 계산
    const convertedAmount = amount * exchangeRate;

    // 금액 형식 변경
    const formattedAmount = formatAmount(convertedAmount);


    // 기준 날짜
    let dateText = "";

    if (data[0].date) {

      const formattedDate = data[0].date.replace(
        /20(\d{2}-\d{2}-\d{2} \d{2}:\d{2}):\d{2}/,
        "$1"
      );

      dateText = ` (${t("date")}: ${formattedDate})`;

    }


    // 결과 출력
    resultText.textContent =
      `${t("result")} ${formatAmount(amount)} ${fromCurrency} = ${formattedAmount} ${toCurrency}${dateText}`;


  } catch (error) {

    console.error("환율 계산 오류:", error);

    // 가장 최근 요청에 대해서만 오류 표시
    if (currentRequestId === requestId) {

      resultText.textContent = t("error");

    }

  }

}


// ========================================
// 12. 계산 버튼 이벤트
// ========================================

convertButton.addEventListener("click", () => {

  updateExchangeRate();

});


// ========================================
// 13. Enter 키 이벤트
// ========================================

amountInput.addEventListener("keydown", event => {

  if (event.key === "Enter") {

    event.preventDefault();

    updateExchangeRate();

  }

});


// ========================================
// 14. 통화 선택 변경 이벤트
// ========================================

fromCurrencySelect.addEventListener("change", () => {

  updateExchangeRate();

});

toCurrencySelect.addEventListener("change", () => {

  updateExchangeRate();

});


// ========================================
// 15. 프로그램 초기화
// ========================================

async function initializeApp() {

  // 처음 화면 언어 설정
  updateContent();

  try {

    // 전체 통화 데이터 가져오기
    const response = await fetch(
      "https://api.manana.kr/exchange.json"
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    // JSON 데이터 저장
    currencyData = await response.json();

    // 통화 선택창 생성
    renderCurrencyOptions();

    // 첫 환율 계산
    updateExchangeRate();

  } catch (error) {

    console.error("통화 데이터 로딩 오류:", error);

    resultText.textContent = t("error");

  }

}


// ========================================
// 16. 프로그램 실행
// ========================================

initializeApp();
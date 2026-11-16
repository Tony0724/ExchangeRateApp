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
const MAX_AMOUNT = 999999999999999999999999n;

// 입력 문자열 최대 길이
const MAX_INPUT_LENGTH = 100;

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

  // HTML 언어 변경
  document.documentElement.lang = currentLanguage;

  // 페이지 제목 변경
  document.title = t("title");

  // 제목 변경
  document.querySelector(".header p").textContent =
    t("header");

  // 입력창 설명 변경
  document.querySelector('label[for="amount"]').textContent =
    t("amount");

  // 통화 선택 설명 변경
  document.querySelector('label[for="from-currency"]').textContent =
    t("fromCurrency");

  document.querySelector('label[for="to-currency"]').textContent =
    t("toCurrency");

  // 입력창 안내 문구 변경
  amountInput.placeholder = t("placeholder");

  // 계산 버튼 변경
  convertButton.textContent = t("button");

  // 현재 언어를 선택창에 표시
  langSelect.value = currentLanguage;

  // 결과 영역 변경
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
// 6. 정확한 십진수 처리
// ========================================

function parseDecimal(value) {

  let text = String(value).trim();

  // 빈 문자열 검사
  if (text === "" || text.length > MAX_INPUT_LENGTH) {
    return null;
  }

  // 쉼표가 있는 경우 올바른 천 단위 표기인지 검사
  if (text.includes(",")) {

    const validGrouping =
      /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d*)?(?:e[+-]?\d+)?$/i;

    if (!validGrouping.test(text)) {
      return null;
    }

    text = text.replace(/,/g, "");

  }

  // 정규식으로 숫자 형식 검사
  const match = text.match(
    /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i
  );

  if (!match) {
    return null;
  }

  // 부호
  const sign = match[1] === "-" ? -1n : 1n;

  // 정수 부분
  const integerPart = match[2] || "0";

  // 소수 부분
  const decimalPart = match[3] ?? match[4] ?? "";

  // 지수 부분
  const exponent = Number(match[5] || 0);

  if (
    !Number.isSafeInteger(exponent) ||
    Math.abs(exponent) > 100
  ) {
    return null;
  }

  // 숫자를 하나의 문자열로 결합
  let digits = integerPart + decimalPart;

  let scale = decimalPart.length - exponent;

  // 소수점 이동
  if (scale < 0) {

    if (digits.length - scale > MAX_INPUT_LENGTH) {
      return null;
    }

    digits += "0".repeat(-scale);

    scale = 0;

  }

  // 지나치게 긴 소수점 제한
  if (scale > 100 || digits.length > MAX_INPUT_LENGTH) {
    return null;
  }

  // BigInt로 변환
  let coefficient = BigInt(digits || "0") * sign;

  // 불필요한 소수점 뒤 0 제거
  while (
    scale > 0 &&
    coefficient % 10n === 0n
  ) {

    coefficient /= 10n;

    scale--;

  }

  return {
    coefficient,
    scale
  };

}


// ========================================
// 7. 십진수 곱셈
// ========================================

function multiplyDecimals(a, b) {

  return {

    coefficient: a.coefficient * b.coefficient,

    scale: a.scale + b.scale

  };

}


// ========================================
// 8. 소수점 둘째 자리까지 반올림
// ========================================

function toCents(value) {

  const negative = value.coefficient < 0n;

  const coefficient = negative
    ? -value.coefficient
    : value.coefficient;

  let result;

  if (value.scale <= 2) {

    result =
      coefficient * 10n ** BigInt(2 - value.scale);

  } else {

    const divisor =
      10n ** BigInt(value.scale - 2);

    result = coefficient / divisor;

    const remainder = coefficient % divisor;

    // 반올림
    if (remainder * 2n >= divisor) {

      result++;

    }

  }

  return negative ? -result : result;

}


// ========================================
// 9. 한국어 큰 숫자 단위 표시
// ========================================

function displayDeposit(target) {

  const units = [
    "",
    "만",
    "억",
    "조",
    "경",
    "해",
    "자",
    "양",
    "구",
    "간",
    "정",
    "재",
    "극"
  ];

  if (target === 0n) {
    return "0";
  }

  let remaining = target;
  let index = 0;

  const result = [];

  while (remaining > 0n) {

    const group = remaining % 10000n;

    if (group > 0n) {

      // 빈 문자열도 정상적인 단위로 처리
      const unit = units[index] ?? "";

      result.unshift(
        `${group.toLocaleString("ko-KR")}${unit}`
      );

    }

    remaining /= 10000n;
    index++;

  }

  return result.join(" ");

}


// ========================================
// 10. 정수 부분 표시
// ========================================

function formatInteger(integerPart) {

  // 한국어 모드에서 1만 이상이면 단위 표시
  if (
    currentLanguage === "ko" &&
    integerPart >= 10000n
  ) {

    return displayDeposit(integerPart);

  }

  const locale = currentLanguage === "ko"
    ? "ko-KR"
    : "en-US";

  return integerPart.toLocaleString(locale);

}


// ========================================
// 11. 입력 금액 표시
// ========================================

function formatInputAmount(value) {

  const negative = value.coefficient < 0n;

  const absolute = negative
    ? -value.coefficient
    : value.coefficient;

  const divisor =
    10n ** BigInt(value.scale);

  const integerPart = absolute / divisor;

  const decimalPart = absolute % divisor;

  const formattedInteger = formatInteger(integerPart);

  let formattedDecimal = "";

  if (value.scale > 0) {

    formattedDecimal =
      decimalPart.toString().padStart(value.scale, "0");

  }

  return (
    (negative ? "-" : "") +
    formattedInteger +
    (formattedDecimal ? "." + formattedDecimal : "")
  );

}


// ========================================
// 12. 최종 계산 금액 표시
// ========================================

function formatAmount(cents) {

  const negative = cents < 0n;

  const absolute = negative
    ? -cents
    : cents;

  const integerPart = absolute / 100n;

  const decimalPart = (absolute % 100n)
    .toString()
    .padStart(2, "0");

  const formattedInteger = formatInteger(integerPart);

  return (
    (negative ? "-" : "") +
    formattedInteger +
    "." +
    decimalPart
  );

}


// ========================================
// 13. 특수 통화 이름
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
// 14. 통화 옵션 생성
// ========================================

function createOptions(data) {

  return data.map(item => {

    // 통화 코드 추출
    const symbol = String(item.symbol || "")
      .replace("=X", "");

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
// 15. 통화 선택창 렌더링
// ========================================

function renderCurrencyOptions() {

  // 기존 선택 통화 기억
  const previousFromValue = fromCurrencySelect.value;

  const previousToValue = toCurrencySelect.value;

  // 통화 옵션 생성
  const options = createOptions(currencyData);

  // 중복 통화 제거
  const uniqueOptions = [

    ...new Map(
      options.map(option => [
        option.value,
        option
      ])
    ).values()

  ];


  // USD가 없으면 추가
  if (
    !uniqueOptions.some(option => option.value === "USD")
  ) {

    uniqueOptions.push({

      value: "USD",

      text: currentLanguage === "ko"
        ? "미국 달러 (USD)"
        : "US Dollar (USD)"

    });

  }


  // KRW가 없으면 추가
  if (
    !uniqueOptions.some(option => option.value === "KRW")
  ) {

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


  // 사용 가능한 통화 확인
  const availableCurrencies = new Set(
    uniqueOptions.map(option => option.value)
  );


  // 최초 실행
  if (isFirstRender) {

    fromCurrencySelect.value = "USD";

    toCurrencySelect.value = "KRW";

    isFirstRender = false;

  } else {

    // 기존 통화 선택 유지
    fromCurrencySelect.value =
      availableCurrencies.has(previousFromValue)
        ? previousFromValue
        : "USD";

    toCurrencySelect.value =
      availableCurrencies.has(previousToValue)
        ? previousToValue
        : "KRW";

  }

}


// ========================================
// 16. 환율 계산
// ========================================

async function updateExchangeRate() {

  // 새로운 요청 번호
  const currentRequestId = ++requestId;

  // 선택한 통화
  const fromCurrency = fromCurrencySelect.value;

  const toCurrency = toCurrencySelect.value;

  // 입력 금액
  const rawAmount = amountInput.value.trim();

  // 빈 문자열 검사 및 십진수 변환
  const amount = parseDecimal(rawAmount);


  // 잘못된 입력 검사
  if (
    amount === null ||
    amount.coefficient < 0n
  ) {

    resultText.textContent =
      `${t("result")} ${t("invalid")}`;

    return;

  }


  // 최대 입력 금액 검사
  const amountLimit =
    MAX_AMOUNT * (10n ** BigInt(amount.scale));

  if (amount.coefficient > amountLimit) {

    resultText.textContent =
      `${t("result")} ${t("maxError")}`;

    return;

  }


  // 통화 선택 검사
  if (!fromCurrency || !toCurrency) {

    resultText.textContent = t("error");

    return;

  }


  // 입력 금액 표시
  const formattedInput = formatInputAmount(amount);


  // 같은 통화인 경우
  if (fromCurrency === toCurrency) {

    resultText.textContent =
      `${t("result")} ${formattedInput} ${fromCurrency} = ${formattedInput} ${toCurrency}`;

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
      data[0].rate === undefined
    ) {

      throw new Error("Invalid exchange rate data");

    }


    // 환율을 십진수로 변환
    const exchangeRate = parseDecimal(
      String(data[0].rate)
    );


    // 환율 유효성 검사
    if (
      exchangeRate === null ||
      exchangeRate.coefficient <= 0n
    ) {

      throw new Error("Invalid exchange rate");

    }


    // 이전 요청의 결과 무시
    if (currentRequestId !== requestId) {

      return;

    }


    // 정확한 십진수 곱셈
    const convertedAmount = multiplyDecimals(
      amount,
      exchangeRate
    );


    // 소수점 둘째 자리까지 반올림
    const formattedAmount = formatAmount(
      toCents(convertedAmount)
    );


    // 기준 날짜 표시
    let dateText = "";

    if (data[0].date) {

      const formattedDate = data[0].date.replace(

        /20(\d{2}-\d{2}-\d{2} \d{2}:\d{2}):\d{2}/,

        "$1"

      );

      dateText =
        ` (${t("date")}: ${formattedDate})`;

    }


    // 최종 결과 출력
    resultText.textContent =
      `${t("result")} ${formattedInput} ${fromCurrency} = ${formattedAmount} ${toCurrency}${dateText}`;


  } catch (error) {

    console.error("환율 계산 오류:", error);

    // 가장 최근 요청에 대해서만 오류 표시
    if (currentRequestId === requestId) {

      resultText.textContent = t("error");

    }

  }

}


// ========================================
// 17. 계산 버튼 이벤트
// ========================================

convertButton.addEventListener("click", () => {

  updateExchangeRate();

});


// ========================================
// 18. Enter 키 이벤트
// ========================================

amountInput.addEventListener("keydown", event => {

  if (event.key === "Enter") {

    event.preventDefault();

    updateExchangeRate();

  }

});


// ========================================
// 19. 통화 선택 변경 이벤트
// ========================================

fromCurrencySelect.addEventListener("change", () => {

  updateExchangeRate();

});

toCurrencySelect.addEventListener("change", () => {

  updateExchangeRate();

});


// ========================================
// 20. 프로그램 초기화
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

    if (!Array.isArray(currencyData)) {

      throw new Error("Invalid currency data");

    }


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
// 21. 프로그램 실행
// ========================================

initializeApp();
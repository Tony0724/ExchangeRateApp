// HTML 요소를 가져옵니다.
const fromCurrencySelect = document.getElementById('fromCurrency');
const toCurrencySelect = document.getElementById('toCurrency');
const amountInput = document.getElementById('amount');
const resultText = document.getElementById('result');

const isKorean = navigator.language === 'ko-KR';
if (isKorean) {
  document.getElementById("lang-select").options[1].setAttribute("selected", true);
}

// i18n 초기화
i18next.init({
  lng: isKorean ? "ko" : "en",
  debug: true,
  resources: {
    ko: {
      translation: {
        title: "환율 앱",
        header: "💱 환율 앱",
        fromCurrency: "원래 단위(화폐):",
        ToCurrency: "바꾼 단위(화폐):",
        amount: "가격(양):",
        button: "변환하기",
        reference: `이 사이트에서 제공하는 환율 정보는 <a href="https://api.manana.kr/exchange.json" target="_blank">💱</a>에서 받아온 데이터를 기초로 합니다.`,
        date: "(기준일: "
      }
    },
    en: {
      translation: {
        title: "Exchange App",
        header: "💱 Exchange App",
        fromCurrency: "From Currency:",
        ToCurrency: "To Currency:",
        amount: "Amount:",
        button: "Convert",
        reference: `The exchange rate information provided by this site is based on data received from <a href="https://api.manana.kr/exchange.json" target="_blank">💱</a>.`,
        date: "(Date: "
      }
    }
  }
});

const toggleButton = document.getElementById("toggle-theme");
  const body = document.body;

  toggleButton.addEventListener("click", () => {
    body.classList.toggle("dark");

    // 텍스트도 다국어로 바뀌게 처리
    if (body.classList.contains("dark")) {
      toggleButton.innerText = "☀️";
    } else {
      toggleButton.innerText = "🌙";
    }
  });

// 화면 내 텍스트 업데이트
function updateContent() {
  document.getElementsByTagName("h1")[0].innerHTML = i18next.t("header");
  document.querySelector('label[for="fromCurrency"]').innerHTML = i18next.t("fromCurrency");
  document.querySelector('label[for="toCurrency"]').innerHTML = i18next.t("ToCurrency");
  document.querySelector('label[for="amount"]').innerHTML = i18next.t("amount");
  document.getElementById('convertButton').innerHTML = i18next.t("button");
  document.getElementsByTagName("p")[1].innerHTML = i18next.t("reference");
  document.title = i18next.t("title")
}

// 숫자를 단위별로 나눔
const displayDeposit = (target) => {
  const unitWords = ['', '만', '억', '조', '경'];
  const splitUnit = 10000;
  const splitCount = unitWords.length;
  const resultArray = [];
  let resultString = '';

  for (let i = 0; i < splitCount; i++) {
    const unitResult = Math.floor((target % Math.pow(splitUnit, i + 1)) / Math.pow(splitUnit, i));
    if (unitResult > 0) {
      resultArray[i] = unitResult;
    }
  }

  for (let i = 0; i < resultArray.length; i++) {
    if (!resultArray[i]) continue;
    resultString = resultArray[i] + unitWords[i] + resultString;
  }

  return resultString;
};

// 통화 데이터 저장 변수
let currencyData = [];
let isFirstRender = true;
let previousFromValue;
let previousToValue;

// 옵션 생성 로직
function createOptions(data, lang) {
  const isKorean = lang === "ko";
  return data.map(item => {
    const symbol = item.symbol.replace('=X', '');
    const value = symbol.replace('USD/', '');
    const specialCases = {
      CNH: '중화인민공화국 국외용 위안(CNY와 같음.)|China Overseas Yuan',
      CYP: '키프로스 파운드|Cypriot pound',
      DEM: '독일 마르크|German mark',
      ECS: 'eSync Network(암호화폐|cryptocurrency)',
      FRF: '프랑스 프랑|French franc',
      IEP: '아일랜드 파운드|Irish pound',
      ITL: '이탈리아 리라|Italian lira',
      LTL: '리투아니아 리타|Lithuania Rita',
      LVL: '라트비아 라트|Latvian Lat',
      MGA: '마다가스카르 아리아리|Madagascar Ariari',
      MRO: '모리타니 우기야|Mauritania Ugiya',
      SIT: '슬로베니아 톨라르|Slovenian Tolar',
      XCP: 'Counterparty(암호화폐|cryptocurrency)',
      BRX: 'Breakout Stake(암호화폐|cryptocurrency)',
      HUX: 'high X(암호화폐|cryptocurrency)',
      CNY: '중화인민공화국 위안|Renminbi (Chinese) yuan',
      STD: '상투메 프린시페 도브라|Sao Tome Principe Dobra',
      PHP: '필리핀 페소|Philippine peso'
    };

    let text;
    if (specialCases[symbol]) {
      text = specialCases[symbol] + ` (${symbol})`;
    } else {
      text = isKorean ? `${item.kr} (${symbol})` : `${item.en} (${symbol})`;
    }

    return { value, text };
  });
}

// select 옵션 렌더링
function renderCurrencyOptions(lang) {
  const options = createOptions(currencyData, lang);
  fromCurrencySelect.innerHTML = "";
  toCurrencySelect.innerHTML = "";

  options.sort((a, b) => a.text.localeCompare(b.text, lang === "ko" ? "ko-KR" : "en-US", { sensitivity: "base" }));

  options.forEach(option => {
    const fromOpt = document.createElement('option');
    fromOpt.value = option.value;
    fromOpt.text = option.text;

    const toOpt = document.createElement('option');
    toOpt.value = option.value;
    toOpt.text = option.text;

    // 첫 렌더링일 때는 USD -> KRW 설정
    if (isFirstRender && option.value === "USD") {
      fromOpt.selected = true;
    }
    if (isFirstRender && option.value === "KRW") {
      toOpt.selected = true;
    }

    fromCurrencySelect.appendChild(fromOpt);
    toCurrencySelect.appendChild(toOpt);
  });

  // 이후부터는 이전 선택 값 유지
  if (!isFirstRender) {
    fromCurrencySelect.value = previousFromValue || fromCurrencySelect.value;
    toCurrencySelect.value = previousToValue || toCurrencySelect.value;
  }

  isFirstRender = false;
}

// 언어 변경 시 처리
i18next.on("languageChanged", (lng) => {
  previousFromValue = fromCurrencySelect.value;
  previousToValue = toCurrencySelect.value;
  updateContent();
  renderCurrencyOptions(lng);
  updateExchangeRate();
});

// 환율 계산
function updateExchangeRate() {
  const fromCurrency = fromCurrencySelect.value;
  const toCurrency = toCurrencySelect.value;
  const amount = parseFloat(amountInput.value);

  if (isNaN(amount)) {
    resultText.innerText = `올바른 값을 입력하십시오. \n Please input a right value.`;
    return;
  }

  const url = `https://api.manana.kr/exchange/rate.json?base=${toCurrency}&code=${fromCurrency}`;
  fetch(url)
    .then(response => response.json())
    .then(data => {
      const exchangeRate = data[0].rate;
      const convertedAmount = (amount * exchangeRate).toFixed(2);
      const formatted = displayDeposit(parseFloat(convertedAmount.replace(/,/g, '')));
      const Ddate = i18next.t("date")
      resultText.innerText = `${amount} ${fromCurrency} = ${formatted} ${toCurrency} ${Ddate + data[0].date.replace(/20(\d{2}-\d{2}-\d{2} \d{2}:\d{2}):\d{2}/, '$1') + ')'}`;
    })
    .catch(error => {
      console.error('Error fetching exchange rate:', error);
      resultText.innerText = `API를 가져오는 과정에서 에러가 발생했습니다. 다시 시도해주십시오. \n We have a error during getting API. Please try again.`;
    });
}

// 환율 데이터 불러오기
fetch('https://api.manana.kr/exchange.json')
  .then(response => response.json())
  .then(data => {
    currencyData = data;
    renderCurrencyOptions(i18next.language);
    updateExchangeRate();

    document.getElementById('convertButton').addEventListener('click', updateExchangeRate);
    amountInput.addEventListener('keypress', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        updateExchangeRate();
      }
    });
  })
  .catch(error => console.error(error));
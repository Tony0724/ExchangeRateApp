// HTML 요소를 가져옵니다.
const fromCurrencySelect = document.getElementById('fromCurrency');
const toCurrencySelect = document.getElementById('toCurrency');
const amountInput = document.getElementById('amount');
const resultText = document.getElementById('result');

// displayDeposit 함수를 정의합니다.
const displayDeposit = (target) => {
  var unitWords = ['', '만', '억', '조', '경'];
  var splitUnit = 10000;
  var splitCount = unitWords.length;
  var resultArray = [];
  var resultString = '';

  for (var i = 0; i < splitCount; i++) {
    var unitResult = (target % Math.pow(splitUnit, i + 1)) / Math.pow(splitUnit, i);
    unitResult = Math.floor(unitResult);
    if (unitResult > 0) {
      resultArray[i] = unitResult;
    }
  }

  for (var i = 0; i < resultArray.length; i++) {
    if (!resultArray[i]) continue;
    resultString = String(resultArray[i]) + unitWords[i] + resultString;
  }

  return resultString;
};

// 환율 정보를 가져오고 select 옵션을 설정합니다.
fetch('https://api.manana.kr/exchange.json')
  .then(response => response.json())
  .then(data => {
    const result = data.map(item => {
      if (item.symbol.includes('=X')) {
        item.symbol = item.symbol.replace('=X', '');
      }
      return item;
    });

    const options = result.map(item => {
      const value = item.symbol.replace('USD/', '');
      let text = '';
      if (item.symbol === "CNH") {
        text = '중화인민공화국 국외용 위안(CNY와 같음.)' + ' ' + '(' + item.symbol + ')'; 
      } else if(item.symbol === "CYP") {
        text = '키프로스 파운드' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === "DEM") {
        text = '독일 마르크' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === "ECS") {
        text = 'eSync Network' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === "FRF") {
        text = '프랑스 프랑' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'IEP') {
        text = '아일랜드 파운드' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'ITL') {
        text = '이탈리아 리라' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === "LTL") {
        text = '리투아니아 리타' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'LVL') {
        text = '라트비아 라트' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'MGA') {
        text = '마다가스카르 아리아리' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'MRO') {
        text = '모리타니 우기야' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'SIT') {
        text = '슬로베니아 톨라르' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'XCP') {
        text = 'Counterparty 암호화폐' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'BRX') {
        text = 'Breakout Stake 암호화폐' + ' ' + '(' + item.symbol + ')';
      } else if(item.symbol === 'HUX') {
        text = 'high X 암호화폐' + ' ' + '(' + item.symbol + ')';
      }
      else if(item.kr === undefined) {
        text = '(' + item.symbol + ')' + ' ' + '-정보가 없습니다.';
      } else {
        text = item.kr + ' ' + '(' + item.symbol + ')';
      }
      return { value, text };
    });

    options.sort((a, b) => a.text.localeCompare(b.text, 'ko-KR', { sensitivity: 'base' }));

    // fromCurrency와 toCurrency 옵션 설정
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.text = option.text;
      if (option.value === 'USD') {
        optionElement.selected = true;
      }
      fromCurrencySelect.appendChild(optionElement);
    });

    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.text = option.text;
      if (option.value === 'KRW') {
        optionElement.selected = true;
      }
      toCurrencySelect.appendChild(optionElement);
    });

    // 환율 정보를 업데이트하는 함수
    const updateExchangeRate = () => {
      const fromCurrency = fromCurrencySelect.value;
      const toCurrency = toCurrencySelect.value;
      const amount = parseFloat(amountInput.value);

      if (isNaN(amount)) {
        resultText.innerText = 'Please enter a valid amount';
        return;
      }

      const url = `https://api.manana.kr/exchange/rate.json?base=${toCurrency}&code=${fromCurrency}`;

      fetch(url)
        .then(response => response.json())
        .then(data => {
          const exchangeRate = data[0].rate;
          const convertedAmount = (amount * exchangeRate).toFixed(2);

          const convertedAmountWithoutComma = parseFloat(convertedAmount.replace(/,/g, ''));
          const formattedValueWithUnit = displayDeposit(convertedAmountWithoutComma);

          resultText.innerText = `${amount} ${fromCurrency} = ${formattedValueWithUnit} ${toCurrency}`;
        })
        .catch(error => {
          console.error('Error fetching exchange rate:', error);
          resultText.innerText = 'Error fetching exchange rate. Please try again later.';
        });
    };

    // Convert 버튼 클릭 시 환율 계산 실행
    const convertButton = document.getElementById('convertButton');
    convertButton.addEventListener('click', updateExchangeRate);

    // Amount 입력창에서 Enter 키 입력 시 환율 계산 실행
    amountInput.addEventListener('keypress', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        updateExchangeRate();
      }
    });

    // 페이지 로딩 시 초기 환율 계산 실행
    updateExchangeRate();
  })
  .catch(error => console.error(error));

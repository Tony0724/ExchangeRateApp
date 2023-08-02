// HTML 요소를 가져옵니다.
const fromCurrencySelect = document.getElementById('fromCurrency');
const toCurrencySelect = document.getElementById('toCurrency');
const amountInput = document.getElementById('amount');
const resultText = document.getElementById('result');

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
      if (item.kr === undefined) {
        text = item.symbol + ' ' + '-정보가 없습니다.';
      } else {
        text = item.kr + ' ' + item.symbol;
      }
      return { value, text };
    });

    options.sort((a, b) => a.text.localeCompare(b.text, 'ko-KR', { sensitivity: 'base' }));

    // fromCurrency와 toCurrency 옵션 설정
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option.value;
      optionElement.text = option.text;
      if (option.value === 'SGD') {
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
          resultText.innerText = `${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`;
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

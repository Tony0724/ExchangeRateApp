const API_KEY = 'fed5374afcb52cdd9d20';
const API_BASE_URL = 'https://free.currconv.com/api/v7';

const currencyConverter = axios.create({
  baseURL: API_BASE_URL,
  params: {
    apiKey: API_KEY,
  },
});

const getAllCurrencies = async () => {
  try {
    const response = await currencyConverter.get('/currencies');
    return response.data.results;
  } catch (error) {
    console.error('Error fetching currencies:', error);
    throw error;
  }
};

const getExchangeRate = async (fromCurrency, toCurrency) => {
    try {
        const response = await currencyConverter.get('/convert', {
          params: {
            q: `${fromCurrency}_${toCurrency}`,
            compact: 'ultra',
          },
        });
        return response.data[`${fromCurrency}_${toCurrency}`];
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        throw error;
      }
};

const convertCurrency = async () => {
  try {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (isNaN(amount)) {
      setResult('Please enter a valid amount');
      return;
    }

    const rate = await getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = (amount * rate).toFixed(2);
    setResult(`${amount} ${fromCurrency} = ${convertedAmount} ${toCurrency}`);
  } catch (error) {
    console.error('Error converting currency:', error);
    setResult('Error converting currency. Please try again later.');
  }
};

const setCurrencyOptions = async () => {
  try {
    const currencies = await getAllCurrencies();
    const fromCurrencySelect = document.getElementById('fromCurrency');
    const toCurrencySelect = document.getElementById('toCurrency');
    const amountInput = document.getElementById('amount');
    amountInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault(); // Prevent form submission on Enter key press
        convertCurrency(); // Trigger the convertCurrency function
      }
    });

    Object.keys(currencies).forEach(currency => {
      const option = document.createElement('option');
      option.text = currency;
      option.value = currency;
      fromCurrencySelect.appendChild(option);
    });

    Object.keys(currencies).forEach(currency => {
      const option = document.createElement('option');
      option.text = currency;
      option.value = currency;
      toCurrencySelect.appendChild(option);
    });

    fromCurrencySelect.value = 'SGD';
    toCurrencySelect.value = 'KRW';
  } catch (error) {
    console.error('Error loading currency options:', error);
  }
};

const setResult = (message) => {
  document.getElementById('result').innerText = message;
};

const convertButton = document.getElementById('convertButton');
convertButton.addEventListener('click', convertCurrency);

setCurrencyOptions();

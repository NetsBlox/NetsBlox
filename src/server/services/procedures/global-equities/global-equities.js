/**
 * This API returns intraday time series of the equity specified, 
 * covering extended trading hours where applicable (e.g., 4:00am to 8:00pm Eastern Time for the US market). 
 * The intraday data is derived from the Securities Information Processor (SIP) market-aggregated data. 
 * Terms of use: https://www.alphavantage.co/terms_of_service/ 
 * @service
 */

 const ApiConsumer = require('../utils/api-consumer');
 const {GlobalEquitiesKey} = require('../utils/api-key');
 const baseUrl = 'https://alphavantage.co';
 const GlobalEquities = new ApiConsumer('GlobalEquities', baseUrl, {cache: {ttl: 30}});
 ApiConsumer.setRequiredApiKey(GlobalEquities, GlobalEquitiesKey);
 const types = require('../../input-types');
 const { matches } = require('lodash');
 
 types.defineType({
     name: 'EquitiesTimePeriod',
     description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
     baseType: 'Enum',
     baseParams: { '5 min': 5, '10 min': 10, '15 min': 15, 'Daily':'daily','Weekly':'weekly','Monthly':'monthly'},
 });
 
 types.defineType({
     name: 'CryptoTimePeriod',
     description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
     baseType: 'Enum',
     baseParams: { '1 min': 1, '5 min': 5, '15 min': 15, '30 min': 30,'60 min':60,'Daily':'daily','Weekly':'weekly','Monthly':'monthly'},
 });

 types.defineType({
    name: 'DateReturn',
    description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
    baseType: 'Enum',
    baseParams: { 'Traditional date':'traditionalDate', 'Fractional Year (for plotting)': 'fractionalYear'},
});

types.defineType({
    name: 'Currencies',
    description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
    baseType: 'Enum',
    baseParams: { 'United Arab Emirates Dirham (AED)':'AED', 'Afghan Afghani (AFN)':'AFN', 'Albanian Lek (ALL)': 'ALL', 'Armenian Dram (AMD)': 'AMD', 'Netherlands Antillean Guilder (ANG)': 'ANG',
    'Angolan Kwanza (AOA)': 'AOA', 'Argentine Peso (ARS)': 'ARS', 'Australian Dollar (AUD)': 'AUD', 'Aruban Florin (AWG)':'AWG', 'Azerbaijani Manat (AZN)':'AZN', 
    'Bosnia-Herzegovina Convertible Mark (BAM)': 'BAM', 'Barbadian Dollar (BBD)': 'BBD', 'Bangladeshi Taka (BDT)': 'BDT', 'Bulgarian Lev (BGN)': 'BGN', 'Bahraini Dinar (BHD)': 'BHD', 
    'Burundian Franc (BIF)': 'BIF', 'Bermudan Dollar (BMD)': 'BMD', 'Brunei Dollar (BND)': 'BND', 'Bolivian Boliviano (BOB)': 'BOB', 'Brazilian Real (BRL)': 'BRL', 'Bahamian Dollar (BSD)':'BSD', 
    'Bhutanese Ngultrum (BTN)':'BTN', 'Botswanan Pula (BWP)':'BWP', 'Belize Dollar (BZD)':'BZD', 'Canadian Dollar (CAD)':'CAD', 'Congolese Franc (CDF)':'CDF', 
    'Swiss Franc (CHF)':'CHF', 'Chilean Unit of Account UF (CLF)':'CLF', 'Chilean Peso (CLP)':'CLP', 'Chinese Yuan Offshore (CNH)':'CNH', 'Chinese Yuan (CNY)':'CNY',
    'Colombian Peso (COP)':'COP', 'Cuban Peso (CUP)':'CUP', 'Cape Verdean Escudo (CVE)':'CVE', 'Czech Republic Koruna (CZK)':'CZK', 'Djiboutian Franc (DJF)':'DJF', 
    'Danish Krone (DKK)':'DKK', 'Dominican Peso (DOP)':'DOP', 'Algerian Dinar (DZD)':'DZD', 'Egyptian Pound (EGP)':'EGP', 'Eritrean Nakfa (ERN)':'ERN', 'Ethiopian Birr (ETB)':'ETB',
    'Euro (EUR)':'EUR', 'Fijian Dollar (FJD)':'FJD', 'Falkland Islands Pound (FKP)':'FKP', 'British Pound Sterling (GBP)':'GBP', 'Georgian Lari (GEL)':'GEL', 'Ghanaian Cedi (GHS)':'GHS', 
    'Gibraltar Pound (GIP)':'GIP', 'Gambian Dalasi (GMD)':'GMD', 'Guinean Franc (GNF)':'GNF', 'Guatemalan Quetzal (GTQ)':'GTQ', 'Guyanaese Dollar (GYD)':'GYD', 'Hong Kong Dollar (HKD)':'HKD', 
    'Honduran Lempira (HNL)':'HNL', 'Croatian Kuna (HRK)':'HRK', 'Haitian Gourde (HTG)':'HTG', 'Hungarian Forint (HUF)':'HUF', 'Internet Computer (ICP)':'ICP', 'Indonesian Rupiah (IDR)':'IDR', 
    'Israeli New Sheqel (ILS)':'ILS', 'Indian Rupee (INR)':'INR', 'Iraqi Dinar (IQD)':'IQD', 'Iranian Rial (IRR)':'IRR', 'Icelandic Krona (ISK)':'ISK', 'Jersey Pound (JEP)':'JEP', 'Jamaican Dollar (JMD)':'JMD', 
    'Jordanian Dinar (JOD)':'JOD', 'Japanese Yen (JPY)':'JPY', 'Kenyan Shilling (KES)':'KES', 'Kyrgystani Som (KGS)':'KGS', 'Cambodian Riel (KHR)':'KHR', 'Comorian Franc (KMF)':'KMF', 'North Korean Won (KPW)':'KPW', 
    'South Korean Won (KRW)':'KRW', 'Kuwaiti Dinar (KWD)':'KWD', 'Cayman Islands Dollar (KYD)':'KYD', 'Kazakhstani Tenge (KZT)':'KZT', 'Laotian Kip (LAK)':'LAK', 'Lebanese Pound (LBP)':'LBP', 'Sri Lankan Rupee (LKR)':'LKR', 
    'Liberian Dollar (LRD)':'LRD', 'Lesotho Loti (LSL)':'LSL', 'Libyan Dinar (LYD)':'LYD', ' Moroccan Dirham (MAD)':'MAD', 'Moldovan Leu (MDL)':'MDL', 'Malagasy Ariary (MGA)':'MGA', 'Macedonian Denar (MKD)':'MKD', 
    'Myanma Kyat (MMK)':'MMK', 'Mongolian Tugrik (MNT)':'MNT', 'Macanese Pataca (MOP)':'MOP', 'Mauritanian Ouguiya (pre-2018) (MRO)':'MRO', 'Mauritanian Ouguiya (MRU)':'MRU', 'Mauritian Rupee (MUR)':'MUR', 
    'Maldivian Rufiyaa (MVR)':'MVR', 'Malawian Kwacha (MWK)':'MWK', 'Mexican Peso (MXN)':'MXN'},
        /*Malaysian Ringgit
        Mozambican Metical
        Namibian Dollar
        Nigerian Naira
        Norwegian Krone
        Nepalese Rupee
        New Zealand Dollar
        Omani Rial
        Panamanian Balboa
        Peruvian Nuevo Sol
        Papua New Guinean Kina
        Philippine Peso
        Pakistani Rupee
        Polish Zloty
        Paraguayan Guarani
        Qatari Rial
        Romanian Leu
        Serbian Dinar
        Russian Ruble
        Old Russian Ruble
        Rwandan Franc
        Saudi Riyal
        Solomon Islands Dollar
        Seychellois Rupee
        Sudanese Pound
        Special Drawing Rights
        Swedish Krona
        Singapore Dollar
        Saint Helena Pound
        Sierra Leonean Leone
        Somali Shilling
        Surinamese Dollar
        Syrian Pound
        Swazi Lilangeni
        Thai Baht
        Tajikistani Somoni
        Turkmenistani Manat
        Tunisian Dinar
        Tongan Pa'anga
        Turkish Lira
        Trinidad and Tobago Dollar
        New Taiwan Dollar
        Tanzanian Shilling
        Ukrainian Hryvnia
        Ugandan Shilling
        United States Dollar
        Uruguayan Peso
        Uzbekistan Som
        Vietnamese Dong
        Vanuatu Vatu
        Samoan Tala
        CFA Franc BEAC
        East Caribbean Dollar
        Special Drawing Rights
        CFA Franc BCEAO
        CFP Franc
        Yemeni Rial
        South African Rand
        Zambian Kwacha
        Zimbabwean Dollar},*/
});
 
 types.defineType({
     name: 'EquitiesCryptoAttributes',
     description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
     baseType: 'Enum',
     baseParams: { 'All': 'all', 'Open': 'open', 'High': 'high', 'Low':'low', 'Close':'close', 'Volume':'volume'},
 });
 
 const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000;
 let CACHED_DATA = undefined;
 let CACHE_TIME_STAMP = undefined;
 
 async function getStockSymbol() {
     if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;
 
     let resultSet = [];
     data = await GlobalEquities._requestData({path:'query', queryString:`function=LISTING_STATUS&apikey=${GlobalEquities.apiKey.value}`});
     var lines = data.split('\n');
     // Process each entry
     for (var i = 0; i < lines.length; i++) {
         tickerResult = [];
         categories = lines[i].split(',');
         // First value is symbol, second is company name
         ticker = categories[0];
         companyName = categories[1];
         if (ticker !== undefined && companyName !== undefined) {
             tickerResult.push(ticker);
             tickerResult.push(companyName);
             resultSet.push(tickerResult);
         }
     }
     CACHED_DATA = resultSet;
     CACHE_TIME_STAMP = Date.now();
 
     // console.log(resultSet.slice(0,10));
     return resultSet;
 }
 
 /**
  * @param {BoundedString<2>} searchString String to search matches
  * @return {Array} Array of results
  */
 GlobalEquities.symbolSearch = async function(searchString){
     const matches = [];
     const listingResult = await getStockSymbol();
     for (const element of listingResult) {
         const results = [];
         if (element[1] !== undefined && (element[1].toLowerCase()).includes(searchString.toLowerCase())) {
             results.push(element[0]);
             results.push(element[1]);
             matches.push(results);
         }
     }
     if (matches.length > 1) {
         return matches;
     }
     else {
         throw new Error('Keyword not recognized within any actively traded stocks or ETFs.');
     }
 }
 
 GlobalEquities._raw_search_equities = async function(apifunction, symbol, interval, attributes, dateReturn) {
     if (apifunction == 'TIME_SERIES_INTRADAY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&interval=${interval}min&apikey=${this.apiKey.value}`});
         labelAppend = `Time Series (${interval}min)`; 
     }
     else if (apifunction == 'TIME_SERIES_DAILY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&apikey=${this.apiKey.value}`});
         labelAppend = 'Time Series (Daily)';
     }
     else if (apifunction == 'TIME_SERIES_WEEKLY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&apikey=${this.apiKey.value}`});
         labelAppend = 'Weekly Time Series';
     }
     else if (apifunction == 'TIME_SERIES_MONTHLY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&apikey=${this.apiKey.value}`});
         labelAppend = 'Monthly Time Series';
     }
 
     if ("Error Message" in data) {
         throw new Error(`Unknown symbol: ${symbol}`);
     }
     
     // Properties within the second property ("Time Series: (XX min)")
     const matches = [];
 
     // Fill time series with time tag and open/high/close
     for (const entry in data[`${labelAppend}`]) {
         const timeserie = [];
         if (dateReturn == 'fractionalYear') {
            yearString = entry.substr(0,entry.indexOf('-'));
            nextYearInt = parseInt(yearString) + 1;
            nextYearString = '' + nextYearInt;
            entryMillisec = new Date(entry) - new Date(yearString);
            entryYear = parseInt(yearString) + entryMillisec/(new Date(nextYearString) - new Date(yearString));
            // Push the key first (time)
            timeserie.push(entryYear);
         }
         else {
            timeserie.push((new Date (entry)).toString());
         }
         
         // Push the rest of the information
         const raw = data[`${labelAppend}`][entry];
         // If key with error message, throw exception string w message
         cleaned = {
             'open': parseFloat(raw['1. open']),
             'high': parseFloat(raw['2. high']),
             'low': parseFloat(raw['3. low']),
             'close': parseFloat(raw['4. close']),
             'volume': parseFloat(raw['5. volume'])
         };
         if (attributes !== 'all') {
             cleaned = cleaned[attributes];
         }
         timeserie.push(cleaned);
         console.log(timeserie);
         // Add to return array
         matches.push(timeserie);
     }
     return matches;
 };
 
 /**
  * Get data of publicly traded stocks
  * @param {String} symbol Ticker symbol
  * @param {EquitiesTimePeriod=} interval If intraday, 5, 10, or 15 minutes
  * @param {EquitiesCryptoAttributes=} attributes May be all or only 1
  * @param {DateReturn} dateReturn Date return format
  * @return {Array} Array of time stamps and associated stock price
  */
 GlobalEquities.getEquityData = function(symbol = 'IBM', interval = 5, attributes = 'all', dateReturn = 'traditionalDate') {
     symbol = symbol.toUpperCase();
     const api_funcs = { daily: 'TIME_SERIES_DAILY', weekly: 'TIME_SERIES_WEEKLY', monthly: 'TIME_SERIES_MONTHLY'};
     const api_func = api_funcs[interval];
     if (api_func == undefined) {
         return GlobalEquities._raw_search_equities('TIME_SERIES_INTRADAY', symbol, interval, attributes, dateReturn);
     }
     return GlobalEquities._raw_search_equities(api_func,symbol, null, attributes, dateReturn);
 }
 
 GlobalEquities._raw_search_crypto = async function(apifunction, symbol, interval, market, attributes, dateReturn) {
     if (apifunction == 'CRYPTO_INTRADAY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&interval=${interval}min&market=${market}&apikey=${this.apiKey.value}`});
         labelAppend = `Time Series Crypto (${interval}min)`; 
     }
     else if (apifunction == 'DIGITAL_CURRENCY_DAILY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
         labelAppend = 'Time Series (Digital Currency Daily)';
     }
     else if (apifunction == 'DIGITAL_CURRENCY_WEEKLY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
         labelAppend = 'Time Series (Digital Currency Weekly)';
     }
     else if (apifunction == 'DIGITAL_CURRENCY_MONTHLY') {
         data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
         labelAppend = 'Time Series (Digital Currency Monthly)';
     }
 
     if ("Error Message" in data) {
         throw new Error(`Unknown symbol: ${symbol}`);
     }
 
     // Properties within the second property ("Time Series: (XX min)")
     const matches = [];
 
     // Print statements to verify read
     // console.log(Object.keys(data));
     // console.log(data[`${labelAppend}`]);
 
     // Fill time series with time tag and open/high/close
     for (const entry in data[`${labelAppend}`]) {
         const timeserie = [];
         if (dateReturn == 'fractionalYear') {
            yearString = entry.substr(0,entry.indexOf('-'));
            nextYearInt = parseInt(yearString) + 1;
            nextYearString = '' + nextYearInt;
            entryMillisec = new Date(entry) - new Date(yearString);
            entryYear = parseInt(yearString) + entryMillisec/(new Date(nextYearString) - new Date(yearString));
            // Push the key first (time)
            timeserie.push(entryYear);
         }
         else {
            timeserie.push((new Date(entry)).toString());
         }
         // Push the rest of the information
         const raw = data[`${labelAppend}`][entry];
         if (apifunction == 'CRYPTO_INTRADAY') {
             cleaned = {
                 'open': parseFloat(raw['1. open']),
                 'high': parseFloat(raw['2. high']),
                 'low': parseFloat(raw['3. low']),
                 'close': parseFloat(raw['4. close']),
                 'volume': parseFloat(raw['5. volume'])
             };
         }
         else {
             cleaned = {
                 'open': parseFloat(raw['1b. open (USD)']),
                 'high': parseFloat(raw['2b. high (USD)']),
                 'low': parseFloat(raw['3b. low (USD)']),
                 'close': parseFloat(raw['4b. close (USD)']),
                 'volume': parseFloat(raw['5. volume'])
             };
         }
         if (attributes !== 'all') {
             cleaned = cleaned[attributes];
         }
         timeserie.push(cleaned);
         console.log(timeserie);
         // Add to return array
         matches.push(timeserie);
     }
     return matches;
 }
 
 /**
  * Get data of cryptocurrencies / digital currencies in USD
  * @param {String} symbol Crypto symbol
  * @param {CryptoTimePeriod=} interval Interval selected by user
  * @param {EquitiesCryptoAttributes=} attributes May be all or only 1
  * @param {DateReturn} dateReturn Date return format
  * @return {Array} Array of time stamps and associated stock price
 */
 GlobalEquities.getCryptoData = function(symbol = 'ETH', interval = 5, attributes = 'all', dateReturn = 'traditionalDate') {
     symbol = symbol.toUpperCase();
     const api_funcs = { daily: 'DIGITAL_CURRENCY_DAILY', weekly: 'DIGITAL_CURRENCY_WEEKLY', monthly: 'DIGITAL_CURRENCY_MONTHLY'};
     const api_func = api_funcs[interval];
     if (api_func == undefined) {
         return GlobalEquities._raw_search_crypto('CRYPTO_INTRADAY', symbol, interval, 'USD', attributes, dateReturn);
     }
     return GlobalEquities._raw_search_crypto(api_func,symbol, null, 'USD', attributes, dateReturn);
 }

 //
 //
 //

 GlobalEquities._raw_search_crypto = async function(apifunction, from_symbol, to_symbol, interval, attributes, dateReturn) {
    if (apifunction == 'FX_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${from_symbol}&to_symbol=${to_symbol}&interval=${interval}min&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series FX (${interval}min)`; 
    }
    else if (apifunction == 'FX_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series FX (Daily)';
    }
    else if (apifunction == 'FX_WEEKLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series FX (Weekly)';
    }
    else if (apifunction == 'FX_MONTHLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${from_symbol}&to_symbol=${to_symbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series FX (Monthly)';
    }

    if ("Error Message" in data) {
        throw new Error(`Unknown symbol: ${symbol}`);
    }

    // Properties within the second property ("Time Series: (XX min)")
    const matches = [];

    // Fill time series with time tag and open/high/close
    for (const entry in data[`${labelAppend}`]) {
        const timeserie = [];
        if (dateReturn == 'fractionalYear') {
           yearString = entry.substr(0,entry.indexOf('-'));
           nextYearInt = parseInt(yearString) + 1;
           nextYearString = '' + nextYearInt;
           entryMillisec = new Date(entry) - new Date(yearString);
           entryYear = parseInt(yearString) + entryMillisec/(new Date(nextYearString) - new Date(yearString));
           // Push the key first (time)
           timeserie.push(entryYear);
        }
        else {
           timeserie.push((new Date(entry)).toString());
        }
        // Push the rest of the information
        const raw = data[`${labelAppend}`][entry];
        cleaned = {
            'open': parseFloat(raw['1. open']),
            'high': parseFloat(raw['2. high']),
            'low': parseFloat(raw['3. low']),
            'close': parseFloat(raw['4. close']),
        };
        if (attributes !== 'all') {
            cleaned = cleaned[attributes];
        }
        timeserie.push(cleaned);
        console.log(timeserie);
        // Add to return array
        matches.push(timeserie);
    }
    return matches;
}

/**
 * Get data of cryptocurrencies / digital currencies in USD
 * @param {String} from_symbol Crypto symbol to convert from
 * @param {String} to_symbol Crypto symbol to convert to
 * @param {CryptoTimePeriod=} interval Interval selected by user
 * @param {EquitiesCryptoAttributes=} attributes May be all or only 1
 * @param {DateReturn} dateReturn Date return format
 * @return {Array} Array of time stamps and associated stock price
*/
GlobalEquities.getForexData = function(from_symbol = 'USD', to_symbol = 'CNY', interval = 5, attributes = 'all', dateReturn = 'traditionalDate') {
    from_symbol = from_symbol.toUpperCase();
    to_symbol = to_symbol.toUpperCase();
    const api_funcs = { daily: 'FX_DAILY', weekly: 'FX_WEEKLY', monthly: 'FX_MONTHLY'};
    const api_func = api_funcs[interval];
    if (api_func == undefined) {
        return GlobalEquities._raw_search_crypto('FX_INTRADAY', from_symbol, to_symbol, interval, attributes, dateReturn);
    }
    return GlobalEquities._raw_search_crypto(api_func,from_symbol, to_symbol, null, attributes, dateReturn);
}

//
//
//

 /**
  * Get data of publicly traded stocks
  * @param {String} from_symbol Ticker symbol to convert from
  * @param {Integer} amount Amount to convert
  * @param {String} to_symbol Ticker symbol to convert to
  * @return {Array} Array of time stamps and associated stock price
  */
  GlobalEquities.currencyConverter = async function(from_symbol = 'USD', amount = 1, to_symbol = 'CNY') {
    from_symbol = from_symbol.toUpperCase();
    to_symbol = to_symbol.toUpperCase();
    data = await this._requestData({path:'query', queryString:`function=CURRENCY_EXCHANGE_RATE&from_currency=${from_symbol}&to_currency=${to_symbol}&apikey=${this.apiKey.value}`});
    if ("Error Message" in data) {
        throw new Error(`One more more unknown symbols: ${symbol_from}, ${symbol_to}`);
    }
    // Properties within the second property ("Time Series: (XX min)")
    const matches = [];
    console.log(data);
    // Fill time series with time tag and open/high/close
     const timeserie = [];
     dateEntry = data['Realtime Currency Exchange Rate']['6. Last Refreshed'];
     console.log(dateEntry);
     console.log(typeof(dateEntry));
     valueEntry = data['Realtime Currency Exchange Rate']['5. Exchange Rate'];
    timeserie.push((new Date(dateEntry)).toString());
    timeserie.push(parseFloat(valueEntry) * amount + '');
     // Add to return array
     matches.push(timeserie);
    
    return matches;
};
 
 module.exports = GlobalEquities;
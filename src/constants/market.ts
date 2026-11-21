import { CoinOption, FiatOption, QuickRangeKey } from '../types/crypto';

export const COINS: CoinOption[] = [
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'hedera-hashgraph', symbol: 'HBAR', name: 'Hedera' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'shiba-inu', symbol: 'SHIB', name: 'Shiba Inu' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
  { id: 'sui', symbol: 'SUI', name: 'Sui' },
  { id: 'tether', symbol: 'USDT', name: 'Tether' },
  { id: 'the-open-network', symbol: 'TON', name: 'Toncoin' },
  { id: 'tron', symbol: 'TRX', name: 'TRON' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USDC' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
];

export const FIAT_CURRENCIES: FiatOption[] = [
  { code: 'gbp', isoCode: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'usd', isoCode: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'eur', isoCode: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'cad', isoCode: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'aud', isoCode: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'jpy', isoCode: 'JPY', symbol: '¥', name: 'Japanese Yen' },
];

export const QUICK_RANGES: Exclude<QuickRangeKey, 'CUSTOM'>[] = [
  '7D',
  '30D',
  '90D',
  'YTD',
  '1Y',
];

export const FREE_TIER_MAX_DAYS = 364;

export const LEGAL_DISCLAIMER_TEXT =
  'Educational Disclaimer: Crypto Data Explorer is an independent educational and historical data tool. It is not authorised or regulated by the Financial Conduct Authority (FCA). All charts, metrics, and historical records are provided strictly for informational and training purposes and do not constitute financial, investment, or trading advice.';

export const SUPPLEMENTARY_LEGAL_NOTICE_TEXT =
  'Additional Terms & Risk Information: Cryptoassets are volatile, high-risk assets, and past performance is not a reliable indicator of future results. Historical market data is sourced from CoinGecko and displayed "as is" for education and research without any warranty of accuracy, completeness, or uninterrupted availability; automated plain-English summaries are strictly retrospective and should always be checked against the underlying figures. Inclusion of any cryptocurrency in the alphabetical reference list does not imply an endorsement, recommendation, or invitation to invest, and Crypto Data Explorer is not affiliated with or endorsed by CoinGecko. To the fullest extent permitted by law, no liability is accepted for any loss or damage arising from reliance on this tool. This app uses browser storage solely for temporary session chart caching and notice dismissal state (no advertising or tracking cookies).';


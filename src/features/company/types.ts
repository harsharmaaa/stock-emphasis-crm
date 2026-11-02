export interface CompanyDetailsValues {
  name: string;
  website: string;
  state: string;
  city: string;
  address: string;
  monthStartDay: string; // e.g. "01", "02", ... "28", "29", "30", "31"
  monthEndDay: string;   // e.g. "Last Day Of Month", "28", "29", "30", "31", etc.
  policy: string;        // multiline/rich policy text
}


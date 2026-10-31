const countryCodes = [
  ["India", "+91"],
  ["US / Canada", "+1"],
  ["UK", "+44"],
  ["Pakistan", "+92"],
  ["Bangladesh", "+880"],
  ["Nepal", "+977"],
  ["Sri Lanka", "+94"],
  ["UAE", "+971"],
  ["Saudi Arabia", "+966"],
  ["Qatar", "+974"],
  ["Kuwait", "+965"],
  ["Australia", "+61"],
  ["Singapore", "+65"],
  ["Malaysia", "+60"],
];

export function formatPhone(phone, phoneCountryCode = "+91") {
  if (!phone) return "";
  if (phone.startsWith("+")) return phone;
  return `${phoneCountryCode} ${phone}`;
}

export default function PhoneInput({
  label,
  phone,
  phoneCountryCode,
  onPhoneChange,
  onCountryCodeChange,
}) {
  const isPresetCode = countryCodes.some(([, code]) => code === phoneCountryCode);

  return (
    <label className="phone-field">
      {label}
      <span className="phone-input">
        <select
          aria-label="Country calling code"
          value={isPresetCode ? phoneCountryCode : "other"}
          onChange={(event) => {
            if (event.target.value !== "other")
              onCountryCodeChange(event.target.value);
          }}
        >
          {countryCodes.map(([country, code]) => (
            <option key={code} value={code}>
              {country} ({code})
            </option>
          ))}
          <option value="other">Other code</option>
        </select>
        {!isPresetCode && (
          <input
            aria-label="Custom country calling code"
            type="tel"
            inputMode="numeric"
            value={phoneCountryCode.replace("+", "")}
            maxLength={3}
            pattern="[0-9]{1,3}"
            required={Boolean(phone)}
            placeholder="Code"
            onChange={(event) =>
              onCountryCodeChange(
                `+${event.target.value.replace(/\D/g, "").slice(0, 3)}`,
              )
            }
          />
        )}
        <input
          aria-label={`${label} number`}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={phone}
          maxLength={10}
          pattern="[0-9]{10}"
          placeholder="10-digit number"
          onChange={(event) =>
            onPhoneChange(event.target.value.replace(/\D/g, "").slice(0, 10))
          }
        />
      </span>
      <small>Enter exactly 10 digits after the country code.</small>
    </label>
  );
}

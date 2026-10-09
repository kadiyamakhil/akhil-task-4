const GEOCODING_API =
  "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_API =
  "https://api.open-meteo.com/v1/forecast";

let unit = "celsius";
let lastLocation = null;

const form = document.querySelector("#search-form");
const input = document.querySelector("#city-input");
const statusBox = document.querySelector("#status");
const content = document.querySelector("#weather-content");
const unitToggle = document.querySelector("#unit-toggle");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = input.value.trim();
  if (!city) return;

  await searchWeather(city);
});

unitToggle.addEventListener("click", async () => {
  unit = unit === "celsius" ? "fahrenheit" : "celsius";
  unitToggle.textContent = unit === "celsius" ? "°C" : "°F";

  if (lastLocation) {
    await loadWeather(lastLocation);
  }
});

async function searchWeather(city) {
  setStatus(`Searching weather for ${city}...`);

  try {
    const url = `${GEOCODING_API}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Location search failed.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      throw new Error(`No city found for "${city}".`);
    }

    lastLocation = data.results[0];
    await loadWeather(lastLocation);
  } catch (error) {
    showError(error.message || "Something went wrong.");
  }
}

async function loadWeather(location) {
  setStatus(`Loading live weather for ${location.name}...`);

  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "7",
    temperature_unit: unit,
    wind_speed_unit: "kmh"
  });

  try {
    const response = await fetch(`${WEATHER_API}?${params}`);

    if (!response.ok) {
      throw new Error("Weather service returned an error.");
    }

    const data = await response.json();
    renderWeather(location, data);
    setStatus(`Updated for ${location.name}.`);
  } catch (error) {
    showError("Unable to load weather. Please check your internet connection and try again.");
  }
}

function renderWeather(location, data) {
  const current = data.current;
  const daily = data.daily;

  content.classList.remove("hidden");

  document.querySelector("#location-name").textContent =
    `${location.name}${location.country ? ", " + location.country : ""}`;

  document.querySelector("#location-meta").textContent =
    `${location.admin1 || ""} • ${data.timezone || location.timezone || ""}`;

  const tempUnit = unit === "celsius" ? "°C" : "°F";

  document.querySelector("#temperature").textContent =
    `${Math.round(current.temperature_2m)}${tempUnit}`;

  document.querySelector("#condition").textContent =
    weatherDescription(current.weather_code);

  document.querySelector("#humidity").textContent =
    `${Math.round(current.relative_humidity_2m)}%`;

  document.querySelector("#wind").textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;

  document.querySelector("#feels-like").textContent =
    `${Math.round(current.apparent_temperature)}${tempUnit}`;

  document.querySelector("#weather-icon").textContent =
    weatherIcon(current.weather_code, current.is_day);

  renderForecast(daily, tempUnit);
}

function renderForecast(daily, tempUnit) {
  const forecast = document.querySelector("#forecast");
  forecast.innerHTML = "";

  daily.time.forEach((date, index) => {
    const card = document.createElement("article");
    card.className = "day-card";

    const dateObj = new Date(`${date}T12:00:00`);
    const dayName = dateObj.toLocaleDateString(undefined, {
      weekday: "short"
    });

    card.innerHTML = `
      <div class="day">${index === 0 ? "Today" : dayName}</div>
      <div class="icon" aria-hidden="true">${weatherIcon(daily.weather_code[index], 1)}</div>
      <strong>${Math.round(daily.temperature_2m_max[index])}${tempUnit}</strong>
      <small>${Math.round(daily.temperature_2m_min[index])}${tempUnit}</small>
    `;

    forecast.appendChild(card);
  });
}

function weatherDescription(code) {
  if (code === 0) return "Clear sky";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown conditions";
}

function weatherIcon(code, isDay = 1) {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if ([1, 2].includes(code)) return isDay ? "🌤️" : "🌙";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([66, 67].includes(code)) return "🌨️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function setStatus(message) {
  statusBox.className = "status";
  statusBox.textContent = message;
}

function showError(message) {
  content.classList.add("hidden");
  statusBox.className = "status error";
  statusBox.textContent = message;
}

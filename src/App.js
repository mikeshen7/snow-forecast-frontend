import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Icon from './Icon';
import {
  getSession,
  requestMagicLink,
  logout,
  getLocations,
  getDailyOverview,
  getDailySegments,
  getHourly,
} from './api';
import {
  buildCalendarRange,
  dayRangeToEpoch,
  differenceInDays,
  formatWeekday,
  toISODate,
} from './utils/date';

const ROLE_WINDOWS = {
  guest: { back: 0, forward: 1 },
  basic: { back: 3, forward: 3 },
  standard: { back: 7, forward: 7 },
  advanced: null,
  admin: null,
  owner: null,
};

const UNIT_STORAGE_KEY = 'snowcast-units';
const WIND_MPH_PER_KMH = 0.621371;
const CM_PER_INCH = 2.54;

function resolveRole(user) {
  if (!user) return 'guest';
  const role = Array.isArray(user.roles) && user.roles.length ? user.roles[0] : 'basic';
  return role;
}

function formatTemp(value) {
  if (value == null || Number.isNaN(value)) return '--';
  return `${Math.round(value)}°F`;
}

function formatSnow(value, units) {
  if (value == null || Number.isNaN(value)) return '--';
  const converted = units === 'metric' ? value * CM_PER_INCH : value;
  const label = units === 'metric' ? 'cm' : 'in';
  return `${converted.toFixed(1)} ${label}`;
}

function formatPrecipValue(value, units) {
  if (value == null || Number.isNaN(value)) return '--';
  const converted = units === 'metric' ? value * CM_PER_INCH : value;
  return `${converted.toFixed(2)}`;
}
function formatWind(value, units) {
  if (value == null || Number.isNaN(value)) return '--';
  const converted = units === 'imperial' ? value * WIND_MPH_PER_KMH : value;
  const label = units === 'imperial' ? 'mph' : 'km/h';
  return `${converted.toFixed(1)} ${label}`;
}

function formatWindValue(value, units) {
  if (value == null || Number.isNaN(value)) return '--';
  const converted = units === 'imperial' ? value * WIND_MPH_PER_KMH : value;
  return `${converted.toFixed(1)}`;
}
function getTempScale(hours) {
  const temps = hours.map((hour) => hour.temp).filter((value) => value != null);
  if (!temps.length) {
    return {
      minGrid: 0,
      maxGrid: 1,
      gridRange: 1,
      step: 1,
    };
  }
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const range = maxTemp - minTemp || 1;
  const stepBase = range / 5;
  const niceStep = (value) => {
    const exponent = Math.floor(Math.log10(value));
    const fraction = value / 10 ** exponent;
    const niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
    return niceFraction * 10 ** exponent;
  };
  const step = niceStep(stepBase);
  const minGrid = Math.floor(minTemp / step) * step;
  const maxGrid = Math.ceil(maxTemp / step) * step;
  const gridRange = maxGrid - minGrid || 1;
  return { minGrid, maxGrid, gridRange, step };
}

function getIconSrc(icon) {
  if (!icon) return null;
  return Icon(icon);
}

function useStoredUnits() {
  const [units, setUnits] = useState(() => {
    const stored = window.localStorage.getItem(UNIT_STORAGE_KEY);
    return stored === 'metric' ? 'metric' : 'imperial';
  });

  useEffect(() => {
    window.localStorage.setItem(UNIT_STORAGE_KEY, units);
  }, [units]);

  return [units, setUnits];
}

function App() {
  const [authStatus, setAuthStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [email, setEmail] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(() => window.localStorage.getItem('snowcast-resort') || '');
  const [dailyOverview, setDailyOverview] = useState(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [units, setUnits] = useStoredUnits();
  const [activeTab] = useState('calendar');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState(null);
  const [dayModalSegments, setDayModalSegments] = useState([]);
  const [dayModalLoading, setDayModalLoading] = useState(false);
  const [hourlyModalOpen, setHourlyModalOpen] = useState(false);
  const [hourlyModalDate, setHourlyModalDate] = useState(null);
  const [hourlyModalData, setHourlyModalData] = useState([]);
  const [hourlyModalLoading, setHourlyModalLoading] = useState(false);
  const hourlyCanvasRef = useRef(null);
  const hourlyChartRef = useRef(null);

  const role = resolveRole(user);
  const [today] = useState(() => new Date());
  const [displayMonth, setDisplayMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const calendar = useMemo(() => buildCalendarRange(displayMonth), [displayMonth]);
  const { startEpoch, endEpoch } = useMemo(
    () => dayRangeToEpoch(calendar.start, calendar.end),
    [calendar.start, calendar.end]
  );

  const overviewByDate = useMemo(() => {
    const map = {};
    if (dailyOverview?.days) {
      dailyOverview.days.forEach((day) => {
        map[day.date] = day;
      });
    }
    return map;
  }, [dailyOverview]);

  const resortSelectWidth = useMemo(() => {
    const longest = locations.reduce((max, loc) => Math.max(max, (loc?.name || '').length), 0);
    const widthCh = Math.max(longest, 12) + 2;
    return `${widthCh}ch`;
  }, [locations]);


  useEffect(() => {
    let isMounted = true;
    getSession()
      .then((data) => {
        if (!isMounted) return;
        if (data?.authenticated) {
          setUser(data.user);
          setAuthStatus('authenticated');
        } else {
          setUser(null);
          setAuthStatus('anonymous');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setUser(null);
        setAuthStatus('anonymous');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    getLocations({ isSkiResort: true, limit: 100 })
      .then((data) => {
        if (!isMounted) return;
        const safeLocations = Array.isArray(data) ? data : [];
        setLocations(safeLocations);
        if (safeLocations.length) {
          setSelectedLocationId((prev) => prev || String(safeLocations[0].id));
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setLocations([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      window.localStorage.setItem('snowcast-resort', selectedLocationId);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    if (!selectedLocationId) return;
    setLoadingForecast(true);
    setForecastError('');

    getDailyOverview({ locationId: selectedLocationId, startDateEpoch: startEpoch, endDateEpoch: endEpoch })
      .then((overview) => {
        setDailyOverview(overview);
        setLoadingForecast(false);
      })
      .catch((error) => {
        setForecastError(error.message || 'Unable to load forecast data.');
        setLoadingForecast(false);
      });
  }, [selectedLocationId, startEpoch, endEpoch]);

  useEffect(() => {
    if (!hourlyModalOpen || !hourlyModalData.length) return;
    const canvas = hourlyCanvasRef.current;
    const container = hourlyChartRef.current;
    if (!canvas || !container) return;

    const width = container.scrollWidth || container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { minGrid, maxGrid, gridRange, step } = getTempScale(hourlyModalData);

    const plotTop = 10;
    const plotBottom = height - 16;
    const plotHeight = plotBottom - plotTop;
    const colWidth = width / hourlyModalData.length;

    ctx.strokeStyle = 'rgba(13, 27, 42, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);

    for (let t = minGrid; t <= maxGrid + 0.001; t += step) {
      const y = plotTop + ((maxGrid - t) / gridRange) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(225, 140, 27, 0.95)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    hourlyModalData.forEach((hour, index) => {
      const tempValue = hour.temp ?? minGrid;
      const ratio = (tempValue - minGrid) / gridRange;
      const x = (index + 0.5) * colWidth;
      const y = plotTop + (1 - ratio) * plotHeight;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = 'rgba(225, 140, 27, 0.95)';
    hourlyModalData.forEach((hour, index) => {
      const tempValue = hour.temp ?? minGrid;
      const ratio = (tempValue - minGrid) / gridRange;
      const x = (index + 0.5) * colWidth;
      const y = plotTop + (1 - ratio) * plotHeight;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [hourlyModalData, hourlyModalOpen]);

  const handleRequestLink = async (event) => {
    event.preventDefault();
    setAuthMessage('');
    try {
      await requestMagicLink(email);
      setAuthMessage('Check your email for a sign-in link.');
      setEmail('');
      setShowLogin(false);
    } catch (error) {
      setAuthMessage(error.message || 'Unable to send login link.');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // no-op
    }
    setUser(null);
    setAuthStatus('anonymous');
  };

  const authBlock = (
    <>
      {authStatus === 'authenticated' ? (
        <div className="auth-info">
          <button type="button" onClick={handleLogout} className="login-trigger">
            Logout
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setShowLogin(true)} className="login-trigger">
          Login
        </button>
      )}
      {authMessage ? <div className="auth-message">{authMessage}</div> : null}
    </>
  );

  const controlsBlock = (
    <>
      <div className="control">
        <select
          id="resort-select"
          value={selectedLocationId}
          onChange={(event) => setSelectedLocationId(event.target.value)}
          style={{ width: resortSelectWidth }}
          aria-label="Resort"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="control control-compact">
        <div className="unit-toggle" role="group" aria-label="Units">
          <button
            type="button"
            className={units === 'imperial' ? 'active' : ''}
            onClick={() => setUnits('imperial')}
          >
            Imperial
          </button>
          <button
            type="button"
            className={units === 'metric' ? 'active' : ''}
            onClick={() => setUnits('metric')}
          >
            Metric
          </button>
        </div>
      </div>
    </>
  );

  const roleWindow = ROLE_WINDOWS[role] ?? null;
  const isDayVisible = (date) => {
    if (!roleWindow) return true;
    const offset = differenceInDays(date, today);
    return offset >= -roleWindow.back && offset <= roleWindow.forward;
  };
  const isSignedIn = authStatus === 'authenticated';

  const handleMonthShift = (direction) => {
    setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  const shiftDateByDay = (date, direction) => {
    const next = new Date(date);
    next.setDate(next.getDate() + direction);
    return next;
  };

  const loadDaySegments = async (date) => {
    setDayModalOpen(true);
    setDayModalDate(date);
    setDayModalSegments([]);
    setDayModalLoading(true);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    try {
      const payload = await getDailySegments({
        locationId: selectedLocationId,
        startDateEpoch: start.getTime(),
        endDateEpoch: end.getTime(),
      });
      const dayKey = toISODate(date);
      const day = payload?.days?.find((entry) => entry.date === dayKey);
      setDayModalSegments(day?.segments || []);
    } catch (error) {
      setDayModalSegments([]);
    } finally {
      setDayModalLoading(false);
    }
  };

  const loadHourly = async (date) => {
    setHourlyModalOpen(true);
    setHourlyModalDate(date);
    setHourlyModalData([]);
    setHourlyModalLoading(true);
    setDayModalOpen(false);

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    try {
      const payload = await getHourly({
        locationId: selectedLocationId,
        startDateEpoch: start.getTime(),
        endDateEpoch: end.getTime(),
      });
      setHourlyModalData(payload?.data || []);
    } catch (error) {
      setHourlyModalData([]);
    } finally {
      setHourlyModalLoading(false);
    }
  };

  const handleDaySelect = async (date, hasAccess) => {
    if (!hasAccess) return;
    await loadDaySegments(date);
  };

  const handleHourlyOpen = async (event) => {
    event.stopPropagation();
    if (!dayModalDate) return;
    await loadHourly(dayModalDate);
  };

  const handleDayShift = async (direction, event) => {
    event.stopPropagation();
    if (!dayModalDate) return;
    const nextDate = shiftDateByDay(dayModalDate, direction);
    if (!isDayVisible(nextDate)) return;
    await loadDaySegments(nextDate);
  };

  const handleHourlyShift = async (direction, event) => {
    event.stopPropagation();
    if (!hourlyModalDate) return;
    const nextDate = shiftDateByDay(hourlyModalDate, direction);
    if (!isDayVisible(nextDate)) return;
    await loadHourly(nextDate);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">Snowcast</div>
        </div>

        <div className="view-select">
          <span className="current-month">
            {displayMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="header-controls desktop-only">
          {controlsBlock}
        </div>

        <div className="header-actions">
          <div className="desktop-only">
            {authBlock}
          </div>
          <button
            type="button"
            className="hamburger-button mobile-only"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="overview">
          {forecastError ? <div className="error-banner">{forecastError}</div> : null}

          {mobileMenuOpen ? (
            <div
              className="mobile-menu-overlay mobile-only"
              id="mobile-menu"
              onClick={() => setMobileMenuOpen(false)}
              role="presentation"
            >
              <div className="mobile-menu" onClick={(event) => event.stopPropagation()}>
                <div className="mobile-menu-header">
                  <span>Menu</span>
                  <button type="button" className="ghost" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                    ✕
                  </button>
                </div>
                <div className="mobile-section">{controlsBlock}</div>
                <div className="mobile-section">{authBlock}</div>
              </div>
            </div>
          ) : null}

          {dayModalOpen ? (
            <div className="day-modal-overlay" role="presentation" onClick={() => setDayModalOpen(false)}>
              <div className="day-modal" role="dialog" aria-modal="true">
                <div className="day-modal-header">
                  <div>
                    <div className="modal-nav">
                      <button
                        type="button"
                        className="ghost nav-arrow"
                        onClick={(event) => handleDayShift(-1, event)}
                        disabled={!dayModalDate || !isDayVisible(shiftDateByDay(dayModalDate, -1))}
                        aria-label="Previous day"
                      >
                        ‹
                      </button>
                      <h2>
                        {dayModalDate
                          ? dayModalDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
                          : 'Day details'}
                      </h2>
                      <button
                        type="button"
                        className="ghost nav-arrow"
                        onClick={(event) => handleDayShift(1, event)}
                        disabled={!dayModalDate || !isDayVisible(shiftDateByDay(dayModalDate, 1))}
                        aria-label="Next day"
                      >
                        ›
                      </button>
                    </div>
                    <p>{dayModalDate ? formatWeekday(dayModalDate) : ''}</p>
                  </div>
                  <button type="button" className="ghost" onClick={() => setDayModalOpen(false)} aria-label="Close day details">
                    ✕
                  </button>
                </div>
                <button type="button" className="hourly-link" onClick={handleHourlyOpen}>
                  Hourly →
                </button>
                {dayModalLoading ? (
                  <div className="day-modal-loading">Loading segments…</div>
                ) : dayModalSegments.length ? (
                  <div className="day-modal-grid">
                    {dayModalSegments.map((segment) => {
                      const iconSrc = segment.representativeHour?.icon
                        ? getIconSrc(segment.representativeHour.icon)
                        : null;
                      return (
                        <div className="segment-card" key={segment.id}>
                          <div className="segment-title">{segment.label}</div>
                          {iconSrc ? <img src={iconSrc} alt="segment icon" /> : <div className="icon-placeholder" />}
                          <div className="segment-sub">
                            <span className="temp-high">{formatTemp(segment.maxTemp)}</span>
                            <span className="temp-low">{formatTemp(segment.minTemp)}</span>
                          </div>
                          <div className="segment-metric">{formatSnow(segment.snowTotal, units)}</div>
                          <div className="segment-sub">Wind {formatWind(segment.avgWindspeed, units)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="day-modal-empty">No segment data available.</div>
                )}
              </div>
            </div>
          ) : null}

          {hourlyModalOpen ? (
            <div className="day-modal-overlay" role="presentation" onClick={() => setHourlyModalOpen(false)}>
              <div className="day-modal" role="dialog" aria-modal="true">
                <div className="day-modal-header">
                  <div>
                    <div className="modal-nav">
                      <button
                        type="button"
                        className="ghost nav-arrow"
                        onClick={(event) => handleHourlyShift(-1, event)}
                        disabled={!hourlyModalDate || !isDayVisible(shiftDateByDay(hourlyModalDate, -1))}
                        aria-label="Previous day"
                      >
                        ‹
                      </button>
                      <h2>
                        {hourlyModalDate
                          ? hourlyModalDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
                          : 'Hourly details'}
                      </h2>
                      <button
                        type="button"
                        className="ghost nav-arrow"
                        onClick={(event) => handleHourlyShift(1, event)}
                        disabled={!hourlyModalDate || !isDayVisible(shiftDateByDay(hourlyModalDate, 1))}
                        aria-label="Next day"
                      >
                        ›
                      </button>
                    </div>
                    <p>{hourlyModalDate ? formatWeekday(hourlyModalDate) : ''}</p>
                  </div>
                  <button type="button" className="ghost" onClick={() => setHourlyModalOpen(false)} aria-label="Close hourly details">
                    ✕
                  </button>
                </div>
                {hourlyModalLoading ? (
                  <div className="day-modal-loading">Loading hourly…</div>
                ) : hourlyModalData.length ? (
                  <div className="hourly-forecast">
                    {(() => {
                      const hours = hourlyModalData;
                      const maxSnow = Math.max(...hours.map((hour) => hour.snow || 0), 6);
                      const { minGrid, gridRange } = getTempScale(hours);
                      const chartHeight = 140;
                      const plotTop = 10;
                      const plotBottom = chartHeight - 16;
                      const plotHeight = plotBottom - plotTop;

                      return (
                        <div className="hourly-table">
                          <div className="hourly-labels">
                            <div className="row-label">Time</div>
                            <div className="row-label">Sky</div>
                            <div className="row-label">Chart</div>
                            <div className="row-label">Precip ({units === 'metric' ? 'cm' : 'in'})</div>
                            <div className="row-label">Type</div>
                            <div className="row-label">Wind ({units === 'imperial' ? 'mph' : 'km/h'})</div>
                          </div>
                          <div className="hourly-scroll">
                            <div className="hourly-scroll-inner" style={{ '--hour-count': hours.length }}>
                              <div className="hourly-row time-row">
                                {hours.map((hour) => {
                                  const time = new Date(hour.dateTimeEpoch).toLocaleTimeString(undefined, { hour: 'numeric' });
                                  return (
                                    <div key={`time-${hour.dateTimeEpoch}`} className="row-cell">
                                      {time}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="hourly-row icon-row">
                                {hours.map((hour) => {
                                  const iconSrc = hour.icon ? getIconSrc(hour.icon) : null;
                                  return (
                                    <div key={`icon-${hour.dateTimeEpoch}`} className="row-cell icon-cell">
                                      {iconSrc ? <img src={iconSrc} alt="hour icon" /> : <div className="icon-placeholder" />}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="hourly-row chart-row">
                                <div className="chart-cells" ref={hourlyChartRef}>
                                  {hours.map((hour) => {
                                    const snowRatio = (hour.snow || 0) / maxSnow;
                                    const tempValue = hour.temp ?? minGrid;
                                    const tempRatio = (tempValue - minGrid) / gridRange;
                                    const tempY = plotTop + (1 - tempRatio) * plotHeight;
                                    return (
                                      <div key={`snow-${hour.dateTimeEpoch}`} className="chart-cell">
                                        <div className="snow-bar" style={{ height: `${snowRatio * 100}%` }} />
                                        <div className="temp-label" style={{ top: `${tempY}px` }}>
                                          {formatTemp(hour.temp)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  <canvas ref={hourlyCanvasRef} className="temp-line-canvas" />
                                </div>
                              </div>

                              <div className="hourly-row precip-row">
                                {hours.map((hour) => (
                                  <div key={`precip-${hour.dateTimeEpoch}`} className="row-cell">
                                    {formatPrecipValue(hour.precip, units)}
                                  </div>
                                ))}
                              </div>

                              <div className="hourly-row precip-type-row">
                                {hours.map((hour) => {
                                  const type = Array.isArray(hour.precipType) ? hour.precipType[0] : hour.precipType;
                                  return (
                                    <div key={`ptype-${hour.dateTimeEpoch}`} className="row-cell">
                                      {type || '--'}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="hourly-row wind-row">
                                {hours.map((hour) => (
                                  <div key={`wind-${hour.dateTimeEpoch}`} className="row-cell">
                                    {formatWindValue(hour.windspeed, units)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="day-modal-empty">No hourly data available.</div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'calendar' ? (
            <div className="calendar">
              <div className="calendar-weekdays">
                <button
                  type="button"
                  className="weekday-nav"
                  onClick={() => handleMonthShift(-1)}
                  aria-label="Previous month"
                >
                  ‹
                </button>
                {calendar.weeks[0].map((date) => (
                  <div className="weekday-label" key={`weekday-${date.toISOString()}`}>
                    {formatWeekday(date)}
                  </div>
                ))}
                <button
                  type="button"
                  className="weekday-nav"
                  onClick={() => handleMonthShift(1)}
                  aria-label="Next month"
                >
                  ›
                </button>
              </div>
              {calendar.weeks.map((week, index) => (
                <div className="week-block" key={`week-${index}`}>
                  <div className="week-row">
                    {week.map((date) => {
                      const key = toISODate(date);
                      const overview = overviewByDate[key];
                      const hasAccess = isDayVisible(date);
                      const hasOverview = Boolean(overview);
                      const isToday = differenceInDays(date, today) === 0;
                      const visibleOverview = hasAccess ? overview : null;
                      const iconSrc = hasOverview && overview?.representativeHour?.icon
                        ? getIconSrc(overview.representativeHour.icon)
                        : null;
                      const lockedLabel = isSignedIn ? 'Upgrade' : 'Sign-In';
                      const snowAmount = Number(visibleOverview?.snowTotal ?? 0);
                      const isPowDay = hasAccess && hasOverview && snowAmount >= 6;
                      const isSnowDay = hasAccess && hasOverview && snowAmount >= 3;

                      return (
                        <div
                          key={key}
                          className={`day-tile ${hasAccess ? 'active' : 'inactive'} ${isToday ? 'today' : ''} ${isSnowDay ? 'snow-day' : ''} ${isPowDay ? 'pow-day' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleDaySelect(date, hasAccess)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              handleDaySelect(date, hasAccess);
                            }
                          }}
                        >
                          {isPowDay ? <div className="pow-badge desktop-only">POW</div> : null}
                          <div className="day-header">
                            <span className="day-date">{date.getDate()}</span>
                          </div>
                          <div className="day-body">
                            {hasAccess ? (
                              <>
                                {iconSrc ? <img src={iconSrc} alt="forecast icon" /> : <div className="icon-placeholder" />}
                                <div className="day-metrics">
                                  <span className="day-mobile-temps">
                                    <span className="temp-high mobile-metric">{formatTemp(visibleOverview?.maxTemp)}</span>
                                    <span className="temp-low mobile-metric">{formatTemp(visibleOverview?.minTemp)}</span>
                                  </span>
                                  <span className="metric-secondary">
                                    <span className="temp-high">{formatTemp(visibleOverview?.maxTemp)}</span>
                                    <span className="temp-low">{formatTemp(visibleOverview?.minTemp)}</span>
                                  </span>
                                  <span className="metric-primary mobile-metric">{formatSnow(visibleOverview?.snowTotal, units)}</span>
                                </div>
                              </>
                            ) : (
                              <div className="day-locked">{lockedLabel}</div>
                            )}
                          </div>
                          <div className="day-footer">
                            <span>{hasAccess ? formatWind(visibleOverview?.avgWindspeed, units) : ''}</span>
                            <span>{hasAccess ? 'Snow' : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="weekly-placeholder">
              <h2>Weekly view</h2>
              <p>Coming soon. This tab will highlight weekly snowfall totals and trends.</p>
            </div>
          )}

          {loadingForecast ? <div className="loading">Loading forecast…</div> : null}
        </section>
      </main>

      {showLogin ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowLogin(false)}>
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="login-title">Login</h2>
              <button type="button" className="ghost" onClick={() => setShowLogin(false)} aria-label="Close login">
                ✕
              </button>
            </div>
            <p className="modal-subtitle">We will email you a secure magic link.</p>
            <form onSubmit={handleRequestLink} className="modal-form">
              <input
                type="email"
                placeholder="email@domain.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button type="submit">Login</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;

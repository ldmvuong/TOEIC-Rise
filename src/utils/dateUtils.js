import dayjs from "dayjs";

/**
 * Format date cho API (YYYY-MM-DD)
 * @param {dayjs.Dayjs|Date|string} date - Ngày cần format
 * @returns {string} - Ngày đã format theo định dạng YYYY-MM-DD
 */
export const formatDateForAPI = (date) => {
  return dayjs(date).format("YYYY-MM-DD");
};

/**
 * Format date cho hiển thị (DD/MM)
 * @param {dayjs.Dayjs|Date|string} date - Ngày cần format
 * @returns {string} - Ngày đã format theo định dạng DD/MM
 */
export const formatDateForDisplay = (date) => {
  return dayjs(date).format("DD/MM");
};

/**
 * Format date cho hiển thị đầy đủ (DD/MM/YYYY)
 * @param {dayjs.Dayjs|Date|string} date - Ngày cần format
 * @returns {string} - Ngày đã format theo định dạng DD/MM/YYYY
 */
export const formatDateFull = (date) => {
  return dayjs(date).format("DD/MM/YYYY");
};

/**
 * Lấy date range theo preset label
 * @param {string} presetLabel - Label của preset ("7 ngày qua", "30 ngày qua", "Tháng này", "Tháng trước")
 * @returns {[dayjs.Dayjs, dayjs.Dayjs]} - Mảng chứa [startDate, endDate]
 */
export const getPresetDates = (presetLabel) => {
  const today = dayjs();
  switch (presetLabel) {
    case "7 ngày qua":
      return [today.subtract(7, "day"), today];
    case "30 ngày qua":
      return [today.subtract(30, "day"), today];
    case "Tháng này":
      return [today.startOf("month"), today];
    case "Tháng trước":
      return [
        today.subtract(1, "month").startOf("month"),
        today.subtract(1, "month").endOf("month"),
      ];
    default:
      return [today.subtract(30, "day"), today];
  }
};

/**
 * Lấy danh sách các preset options cho Date Range Picker
 * @returns {Array} - Mảng các preset options
 */
export const getPresetOptions = () => {
  return [
    { label: "Last 7 Days", value: "7 ngày qua" },
    { label: "Last 30 Days", value: "30 ngày qua" },
    { label: "This Month", value: "Tháng này" },
    { label: "Last Month", value: "Tháng trước" },
    { label: "Custom", value: "Tùy chỉnh" },
  ];
};

/**
 * Phát hiện preset label từ date range
 * @param {[dayjs.Dayjs, dayjs.Dayjs]} dateRange - Date range cần kiểm tra
 * @returns {string} - Preset label tương ứng hoặc "Tùy chỉnh"
 */
export const detectPresetFromDateRange = (dateRange) => {
  if (!dateRange || !dateRange[0] || !dateRange[1]) {
    return "Tùy chỉnh";
  }

  const today = dayjs();
  const last7Days = [today.subtract(7, "day"), today];
  const last30Days = [today.subtract(30, "day"), today];
  const thisMonth = [today.startOf("month"), today];
  const lastMonth = [
    today.subtract(1, "month").startOf("month"),
    today.subtract(1, "month").endOf("month"),
  ];

  const isLast7Days =
    dateRange[0].isSame(last7Days[0], "day") &&
    dateRange[1].isSame(last7Days[1], "day");
  const isLast30Days =
    dateRange[0].isSame(last30Days[0], "day") &&
    dateRange[1].isSame(last30Days[1], "day");
  const isThisMonth =
    dateRange[0].isSame(thisMonth[0], "day") &&
    dateRange[1].isSame(thisMonth[1], "day");
  const isLastMonth =
    dateRange[0].isSame(lastMonth[0], "day") &&
    dateRange[1].isSame(lastMonth[1], "day");

  if (isLast7Days) return "7 ngày qua";
  if (isLast30Days) return "30 ngày qua";
  if (isThisMonth) return "Tháng này";
  if (isLastMonth) return "Tháng trước";
  return "Tùy chỉnh";
};

/**
 * Lấy date range mặc định (30 ngày qua)
 * @returns {[dayjs.Dayjs, dayjs.Dayjs]} - Mảng chứa [startDate, endDate]
 */
export const getDefaultDateRange = () => {
  const today = dayjs();
  return [today.subtract(30, "day"), today];
};

/**
 * Tính toán số ngày trong khoảng thời gian
 * @param {dayjs.Dayjs|Date|string} startDate - Ngày bắt đầu
 * @param {dayjs.Dayjs|Date|string} endDate - Ngày kết thúc
 * @returns {number} - Số ngày
 */
export const getDaysDifference = (startDate, endDate) => {
  return dayjs(endDate).diff(dayjs(startDate), "day") + 1;
};

/**
 * Tính toán interval cho XAxis dựa trên số lượng data points
 * Mục tiêu: hiển thị khoảng 6-8 labels trên trục X
 * @param {number} dataLength - Số lượng data points
 * @returns {number} - Interval (0 = hiển thị tất cả, 1 = bỏ qua 1, 2 = bỏ qua 2, ...)
 */
export const calculateXAxisInterval = (dataLength) => {
  if (!dataLength || dataLength <= 0) return 0;
  
  // Mục tiêu: hiển thị khoảng 6-8 labels
  const targetLabels = 7;
  
  if (dataLength <= targetLabels) {
    return 0; // Hiển thị tất cả
  }
  
  // Tính interval để có khoảng targetLabels labels
  const interval = Math.floor(dataLength / targetLabels);
  return interval;
};

/**
 * Format date cho chart label dựa trên khoảng thời gian
 * @param {dayjs.Dayjs|Date|string} date - Ngày cần format
 * @param {number} daysDifference - Số ngày trong khoảng thời gian
 * @param {number} index - Index của điểm dữ liệu trong mảng
 * @param {number} totalPoints - Tổng số điểm dữ liệu
 * @returns {string} - Date đã format (empty string nếu không hiển thị)
 */
export const formatDateForChart = (date, daysDifference, index, totalPoints) => {
  const d = dayjs(date);
  
  // Nếu khoảng thời gian <= 30 ngày: hiển thị tất cả với format DD/MM
  if (daysDifference <= 30) {
    return d.format("DD/MM");
  }
  
  // Nếu khoảng thời gian <= 90 ngày: hiển thị mỗi tuần một lần
  if (daysDifference <= 90) {
    // Hiển thị ngày đầu tuần (thứ 2) hoặc ngày đầu tháng
    const dayOfWeek = d.day(); // 0 = Chủ nhật, 1 = Thứ 2, ...
    const dayOfMonth = d.date();
    
    // Hiển thị ngày đầu tháng hoặc ngày đầu tuần (thứ 2)
    if (dayOfMonth === 1 || dayOfWeek === 1) {
      return d.format("DD/MM");
    }
    return "";
  }
  
  // Nếu khoảng thời gian <= 180 ngày: hiển thị ngày đầu tháng
  if (daysDifference <= 180) {
    if (d.date() === 1) {
      return d.format("DD Tháng M");
    }
    return "";
  }
  
  // Nếu khoảng thời gian > 180 ngày: hiển thị đầu mỗi tháng
  if (d.date() === 1) {
    return d.format("Tháng M/YYYY");
  }
  return "";
};

/**
 * Chuẩn bị data cho chart với date labels được format phù hợp
 * Đảm bảo tất cả data points được vẽ, chỉ labels trên trục X bị giảm
 * @param {Array} points - Mảng các điểm dữ liệu từ API
 * @param {dayjs.Dayjs|Date|string} startDate - Ngày bắt đầu
 * @param {dayjs.Dayjs|Date|string} endDate - Ngày kết thúc
 * @returns {Object} - Object chứa { data, interval, tickFormatter }
 */
export const prepareChartData = (points, startDate, endDate) => {
  if (!points || points.length === 0) {
    return { data: [], interval: 0, tickFormatter: null };
  }

  const daysDiff = getDaysDifference(startDate, endDate);
  
  // Giữ tất cả data points, nhưng chỉ format một số dates để hiển thị label
  // Điều này đảm bảo tất cả điểm được vẽ trên chart
  // Sử dụng dateRaw (date gốc) cho việc vẽ chart, date (formatted) chỉ cho labels
  const data = points.map((point, index) => {
    const formattedDate = formatDateForChart(point.date, daysDiff, index, points.length);
    return {
      date: point.date, // Giữ date gốc để đảm bảo chart vẽ đúng vị trí
      dateLabel: formattedDate, // Label đã format (có thể là empty string)
      dateRaw: point.date, // Giữ lại date gốc cho tooltip
      dateIndex: index, // Giữ index để đảm bảo thứ tự
      submissions: point.submissions || 0,
    };
  });

  // Đếm số labels có giá trị (không rỗng)
  const labelsWithValue = data.filter((d) => d.dateLabel !== "").length;
  
  // Không dùng interval để bỏ qua data points
  // Thay vào đó, sử dụng tickFormatter để chỉ hiển thị label khi có giá trị
  // interval = 0 nghĩa là hiển thị tất cả ticks, nhưng tickFormatter sẽ ẩn những cái không cần
  const interval = 0;

  // Custom tick formatter: chỉ hiển thị label khi có giá trị (không phải empty string)
  // Điều này đảm bảo tất cả data points vẫn được vẽ, chỉ labels bị ẩn
  // value ở đây là date gốc, cần tìm dateLabel tương ứng
  const tickFormatter = (value, index) => {
    // Tìm data point tương ứng với value (date gốc)
    const dataPoint = data.find((d) => d.date === value || d.dateRaw === value);
    if (!dataPoint || !dataPoint.dateLabel || dataPoint.dateLabel === "") {
      return "";
    }
    return dataPoint.dateLabel;
  };

  return { data, interval, tickFormatter };
};

/**
 * Format số lớn cho hiển thị (1.2k, 1.5M, ...)
 * @param {number} value - Giá trị cần format
 * @returns {string} - Giá trị đã format
 */
export const formatLargeNumber = (value) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

/**
 * Tính toán domain cho YAxis (min, max với padding)
 * @param {Array} data - Mảng dữ liệu
 * @param {string} dataKey - Key của giá trị trong data
 * @param {number} paddingPercent - Phần trăm padding (mặc định 10%)
 * @returns {[number, number]} - [min, max] với padding
 */
export const calculateYAxisDomain = (data, dataKey = "submissions", paddingPercent = 0.1) => {
  if (!data || data.length === 0) {
    return [0, 10];
  }

  const values = data.map((item) => Number(item[dataKey]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Nếu tất cả giá trị đều bằng 0, trả về domain mặc định
  if (max === 0) {
    return [0, 10];
  }

  // Tính padding
  const range = max - min;
  const padding = range * paddingPercent;

  // Đảm bảo min không âm (trừ khi có giá trị âm trong data)
  const minValue = Math.max(0, min - padding);
  const maxValue = max + padding;

  // Làm tròn maxValue lên số tròn gần nhất
  // Sử dụng logic tương tự như tính ticks
  if (maxValue < 10) {
    const roundedMax = Math.ceil(maxValue);
    return [minValue, roundedMax];
  } else if (maxValue < 100) {
    const roundedMax = Math.ceil(maxValue / 10) * 10;
    return [minValue, roundedMax];
  } else {
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));
    const normalized = maxValue / magnitude;
    let roundedMax;
    if (normalized <= 1) {
      roundedMax = 1 * magnitude;
    } else if (normalized <= 2) {
      roundedMax = 2 * magnitude;
    } else if (normalized <= 5) {
      roundedMax = 5 * magnitude;
    } else {
      roundedMax = 10 * magnitude;
    }
    return [minValue, roundedMax];
  }
};

/**
 * Tính toán ticks cho YAxis (chia đều và làm tròn)
 * @param {number} min - Giá trị min
 * @param {number} max - Giá trị max
 * @param {number} targetTicks - Số lượng ticks mong muốn (mặc định 5)
 * @returns {Array<number>} - Mảng các giá trị ticks (đã loại bỏ duplicate)
 */
export const calculateYAxisTicks = (min, max, targetTicks = 5) => {
  if (max <= 0) {
    return [0, 5, 10];
  }

  const range = max - min;
  
  // Xử lý trường hợp max nhỏ (< 10)
  if (max < 10) {
    // Với giá trị nhỏ, sử dụng step = 1
    const ticks = [];
    const startValue = Math.max(0, Math.floor(min));
    const endValue = Math.ceil(max);
    
    for (let i = startValue; i <= endValue; i++) {
      ticks.push(i);
      if (ticks.length >= targetTicks) break;
    }
    
    // Đảm bảo có giá trị max
    if (ticks[ticks.length - 1] < max) {
      ticks.push(Math.ceil(max));
    }
    
    // Loại bỏ duplicate và sắp xếp
    return [...new Set(ticks)].sort((a, b) => a - b);
  }
  
  // Tính step lý tưởng cho giá trị lớn hơn
  const idealStep = range / (targetTicks - 1);
  
  // Tìm magnitude phù hợp (1, 2, 5, 10, 20, 50, 100, ...)
  // Xử lý trường hợp idealStep quá nhỏ
  let magnitude;
  if (idealStep < 1) {
    magnitude = 0.1;
  } else {
    magnitude = Math.pow(10, Math.floor(Math.log10(idealStep)));
  }
  
  const normalizedStep = idealStep / magnitude;
  
  // Chọn step làm tròn phù hợp (1, 2, hoặc 5)
  let roundedStep;
  if (normalizedStep <= 1) {
    roundedStep = 1 * magnitude;
  } else if (normalizedStep <= 2) {
    roundedStep = 2 * magnitude;
  } else if (normalizedStep <= 5) {
    roundedStep = 5 * magnitude;
  } else {
    roundedStep = 10 * magnitude;
  }

  // Tính giá trị bắt đầu (làm tròn xuống)
  const startValue = Math.floor(min / roundedStep) * roundedStep;
  
  // Tạo ticks
  const ticks = [];
  let currentValue = startValue;
  const maxValue = Math.ceil(max / roundedStep) * roundedStep;
  
  while (currentValue <= maxValue && ticks.length < targetTicks + 2) {
    // Chỉ thêm nếu giá trị >= min hoặc = 0
    if (currentValue >= min || currentValue === 0) {
      // Làm tròn để tránh floating point errors
      const roundedTick = Math.round(currentValue * 100) / 100;
      if (!ticks.includes(roundedTick)) {
        ticks.push(roundedTick);
      }
    }
    currentValue += roundedStep;
  }

  // Đảm bảo có giá trị max nếu cần
  if (ticks.length > 0) {
    const lastTick = Math.ceil(max / roundedStep) * roundedStep;
    const roundedLastTick = Math.round(lastTick * 100) / 100;
    if (roundedLastTick > ticks[ticks.length - 1] && !ticks.includes(roundedLastTick)) {
      ticks.push(roundedLastTick);
    }
  }

  // Loại bỏ duplicate, sắp xếp và đảm bảo có ít nhất 2 ticks
  const uniqueTicks = [...new Set(ticks)].sort((a, b) => a - b);
  return uniqueTicks.length > 0 ? uniqueTicks : [0, max];
};

/**
 * Format giá trị cho YAxis tick
 * @param {number} value - Giá trị cần format
 * @param {number} maxValue - Giá trị max trong domain
 * @returns {string} - Giá trị đã format
 */
export const formatYAxisTick = (value, maxValue) => {
  // Nếu giá trị nhỏ (< 1000), hiển thị số nguyên
  if (maxValue < 1000) {
    return Math.round(value).toString();
  }

  // Nếu giá trị lớn, format với k/M
  return formatLargeNumber(value);
};

/**
 * Chuẩn bị cấu hình cho YAxis
 * @param {Array} data - Mảng dữ liệu
 * @param {string} dataKey - Key của giá trị trong data
 * @param {number} targetTicks - Số lượng ticks mong muốn
 * @returns {Object} - Object chứa { domain, ticks, tickFormatter }
 */
export const prepareYAxisConfig = (data, dataKey = "submissions", targetTicks = 5) => {
  if (!data || data.length === 0) {
    return {
      domain: [0, 10],
      ticks: [0, 5, 10],
      tickFormatter: (value) => value.toString(),
    };
  }

  const [min, max] = calculateYAxisDomain(data, dataKey);
  const ticks = calculateYAxisTicks(min, max, targetTicks);

  // Đảm bảo ticks không có giá trị trùng lặp và được sắp xếp
  const uniqueTicks = [...new Set(ticks)].sort((a, b) => a - b);

  const tickFormatter = (value) => formatYAxisTick(value, max);

  return {
    domain: [min, max],
    ticks: uniqueTicks,
    tickFormatter,
  };
};


(function ( global, factory ) {
  
  if ( typeof module === "object" && typeof module.exports === "object" ) {
		// module.exports = global.document ?
		// 	factory( global, true ) :
		// 	function( w ) {
		// 		if ( !w.document ) {
		// 			throw new Error( "jQuery requires a window with a document" );
		// 		}
		// 		return factory( w );
		// 	};
	} else {
		factory( global );
	}
})(typeof window !== 'undefined' ? window : this, function ( window, isGlobal ) {

  const RULES = {
    COMMON: {
      REQUIRED: 'COMN_REQUIRED', //___________필수값 여부
      IS: 'COMN_IS', //_______________________값이 비교하는 값과 동일하는지
    },
    STRING: {
      MIN_LENGTH: 'STR_MIN_LENGTH', //________최소길이값
      MAX_LENGTH: 'STR_MAX_LENGTH', //________최대길이값
      ACCEPT_VALUES: 'STR_ACCEPT_VALUES', //__허용가능한 값 정의

      NOT_BLANK: 'STR_NOT_BLANK', //__________공백체크
      EMAIL: 'STR_EMAIL', //__________________이메일형식 체크
      URL: 'STR_URL', //______________________url형식 체크
      MOBILE: 'STR_MOBILE', //________________휴대폰형식 체크
      ONLY_NUMBER: 'STR_ONLY_NUMBER', //______숫자만 허용 (. 혹은 , 포함 X)
      MONEY: 'STR_MONEY', //__________________화폐단위 체크 (숫자 + 콤마)
      NUMERIC: 'STR_NUMERIC', //______________숫자허용 (숫자 + 소수점)
      LOWER: 'STR_LOWER', //__________________소문자로만 이루어져있는지
      UPPER: 'STR_UPPER', //__________________대문자로만 이루어져있는지
    },
    DATE: {
      DATE: 'DATE_DATE', //___________________년,월,일 형식인지 (문자열)
      DATETIME: 'DATE_DATETIME', //___________년,월,일,시,분 형식인지 (문자열)
      NEXT: 'DATE_NEXT', //___________________값보다 미래인지
      NEXT_THAN: 'DATE_NEXT_THAN', //_________프로퍼티의 값보다 미래인지
      PREV: 'DATE_PREV', //___________________값보다 과거인지
      PREV_THAN: 'DATE_PREV_THAN', //_________프로퍼티의 값보다 과거인지
    },
    NUMBER: {
      ACCEPT_VALUES: 'NUM_ACCEPT_VALUES', //__허용가능한 값 정의
      BIGGER: 'NUM_BIG', //___________________값보다 큰지
      BIGGER_THAN: 'NUM_BIG_THAN', //_________프로퍼티의 값보다 큰지
      LESS: 'NUM_LESS', //____________________값보다 작은지
      LESS_THAN: 'NUM_LESS_THAN', //__________프로퍼티의 값보다 작은지
    },
    ARRAY: {
      NOT_EMPTY: 'ARR_NOT_EMPTY', //__________빈값 허용 X
    },
  };
  /**
   * 공통 prototype 정의
   * @param {*} value 
   */
  const VCommonType = function (value) {
    this.value = value;
    this.rules = [];
  };

  VCommonType.prototype.addRule = function (ruleType, contextValue, targetValue, message) {
    this.rules.push(VRule.of(ruleType, contextValue, targetValue, message));
  };
  
  VCommonType.prototype.required = function (message) {
    const defaultMessage = '['.concat(this.value, '] is required');
    this.addRule(RULES.COMMON.REQUIRED, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  VCommonType.prototype.is = function (value, message) {
    const defaultMessage = '['.concat(this.value, '] is not ', value);
    this.addRule(RULES.COMMON.IS, this.value, value, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  VCommonType.prototype.validate = function () {
    const vErrors = new VError();
    this.rules.forEach(function (rule) {
      let condition = false;
      if (rule.hasOwnProperty('ruleType')) {
        switch (rule['ruleType']) {
          case RULES.COMMON.REQUIRED: condition = commonRequiredHandler(rule.contextValue); break;
          case RULES.COMMON.IS: condition = commonIsHandler(rule.contextValue, rule.targetValue); break;

          case RULES.STRING.ACCEPT_VALUES: condition = stringAcceptValuesHandler(rule.contextValue, rule.targetValue); break;
          case RULES.STRING.MIN_LENGTH: condition = stringMinLengthHandler(rule.contextValue, rule.targetValue); break;
          case RULES.STRING.MAX_LENGTH: condition = stringMaxLengthHandler(rule.contextValue, rule.targetValue); break;
          case RULES.STRING.NOT_BLANK: condition = stringNotBlankHandler(rule.contextValue); break;
          case RULES.STRING.EMAIL: condition = stringEmailHandler(rule.contextValue); break;
          case RULES.STRING.URL: condition = stringUrlHandler(rule.contextValue); break;
          case RULES.STRING.MOBILE: condition = stringMobileHandler(rule.contextValue); break;
          case RULES.STRING.ONLY_NUMBER: condition = false; break;
          case RULES.STRING.MONEY: condition = false; break;
          case RULES.STRING.NUMERIC: condition = false; break;
          case RULES.STRING.LOWER: condition = false; break;
          case RULES.STRING.UPPER: condition = false; break;
        }
      }

      if (condition) vErrors.setError(rule.errorMessage, rule.contextValue);
    });
    return vErrors;
  };

  const Vlee = {
    string: function (value) {
      return new VString(value);
    },
    number: function (value) {
      return new VNumber(value);
    },
    array: function (value) {
      return new VArray(value);
    },
    date: function (value) {
      return new VDate(value);
    }
  };

  const VString = function (value) {
    this.constructor(value);
    return Object.freeze(this);
  };

  VString.prototype = Object.create(VCommonType.prototype); // prototype 상속

  /**
   * 허용가능한 값 정의
   * @param {*} availableValueArray 허용 가능한 값을 배열상태로 정의. 예: ['a', 'b', 'c']
   */
  VString.prototype.values = function (availableValueArray, message) {
    const valuesMessage = Array.isArray(availableValueArray) ? availableValueArray.join(', ') : availableValueArray;
    const defaultMessage = '['.concat(this.value, '] is only available in [', valuesMessage, ']');
    this.addRule(RULES.STRING.ACCEPT_VALUES, this.value, availableValueArray, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 문자열 최소길이 제한
   * @param {*} minLength 
   */
  VString.prototype.minLength = function (minLength, message) {
    const defaultMessage = '['.concat(this.value, '] length must exceed ', minLength);
    this.addRule(RULES.STRING.MIN_LENGTH, this.value, minLength, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 문자열 최대길이 제한
   * @param {number} maxLength 
   */
  VString.prototype.maxLength = function (maxLength, message) {
    const defaultMessage = '['.concat(this.value, '] length must not exceed ', maxLength);
    this.addRule(RULES.STRING.MAX_LENGTH, this.value, maxLength, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 공백이 포함되어있는지 확인한다.
   */
  VString.prototype.notBlank = function (message) {
    const defaultMessage = '['.concat(this.value, '] is include white space.');
    this.addRule(RULES.STRING.NOT_BLANK, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 이메일 형식인지 확인한다.
   */
  VString.prototype.email = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not email.');
    this.addRule(RULES.STRING.EMAIL, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * URL 형식인지 확인한다.
   */
  VString.prototype.url = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not url.');
    this.addRule(RULES.STRING.URL, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 휴대폰 형식인지 확인한다.
   */
  VString.prototype.mobile = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not mobile.');
    this.addRule(RULES.STRING.MOBILE, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 숫자로만 이루어져있는지 확인한다.
   */
  VString.prototype.onlyNumber = function (message) {
    const defaultMessage = '['.concat(this.value, '] is accept only number.');
    this.addRule(RULES.STRING.ONLY_NUMBER, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 화폐형식인지 확인한다.
   */
  VString.prototype.money = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not money.');
    this.addRule(RULES.STRING.MONEY, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 숫자(소수점 허용)인지 확인한다.
   */
  VString.prototype.numeric = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not numeric.');
    this.addRule(RULES.STRING.NUMERIC, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 소문자로만 이루어져있는지 확인한다.
   */
  VString.prototype.lower = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not lower.');
    this.addRule(RULES.STRING.LOWER, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 대문자로만 이루어져있는지 확인한다.
   */
  VString.prototype.upper = function (message) {
    const defaultMessage = '['.concat(this.value, '] is not upper.');
    this.addRule(RULES.STRING.UPPER, this.value, undefined, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  const VNumber = function (value) {
    this.constructor(value);
    return Object.freeze(this);
  };
  VNumber.prototype = Object.create(VCommonType.prototype); // prototype 상속

  const VArray = function (value) {
    this.constructor(value);
    return Object.freeze(this);
  };
  VArray.prototype = Object.create(VCommonType.prototype); // prototype 상속

  const VDate = function (value) {
    this.constructor(value);
    return Object.freeze(this);
  };
  VDate.prototype = Object.create(VCommonType.prototype); // prototype 상속

  // 규칙 관련 객체
  const VRule = function (ruleType, contextValue, targetValue, errorMessage) {
    this.ruleType = ruleType;
    this.contextValue = contextValue;
    this.targetValue = targetValue;
    this.errorMessage = errorMessage;
    return Object.freeze(this);
  };

  VRule.of = function (ruleType, contextValue, targetValue, errorMessage) {
    return new VRule(ruleType, contextValue, targetValue, errorMessage);
  };

  // 에러 관련 객체
  const VError = function () {
    this.hasErrors = false;
    this.errors = [];
    return this;
  };

  VError.prototype.setError = function (message, refContext) {
    if (!this.hasErrors) this.hasErrors = true;
    this.errors.push(new VErrorMessage(message, refContext));
  };

  // 에러 메세지
  const VErrorMessage = function (message, refContext) {
    this.message = message;
    this.ref = refContext;
    return Object.freeze(this);
  };

  VErrorMessage.prototype.toString = function () {
    return this.message;
  };

  const isNull = function (val) {
    return val === null || val === undefined || val === '';
  };

  const isString = function (val) {
    return Object.prototype.toString.call(val) === '[object String]';
  };

  const notStringMessageHandler = function (customMessage, defaultMessage) {
    return isString(customMessage) ? customMessage : defaultMessage;
  };

  const commonRequiredHandler = function (contextValue) {
    return isNull(contextValue);
  };

  const commonIsHandler = function (contextValue, targetValue) {
    return contextValue !== targetValue;
  };

  const stringAcceptValuesHandler = function (contextValue, targetValue) {
    const _targetValueList = targetValue || [];
    const _contextValue = contextValue || '';
    return _targetValueList.indexOf(_contextValue) < 0;
  };

  const stringMinLengthHandler = function (contextValue, targetValue) {
    const _contextValue = contextValue || '';
    const _targetValue = targetValue || 0;
    return _contextValue.length < _targetValue;
  };

  const stringMaxLengthHandler = function (contextValue, targetValue) {
    const _contextValue = contextValue || '';
    const _targetValue = targetValue || 0;
    return _contextValue.length > _targetValue;
  };

  const stringNotBlankHandler = function (contextValue) {
    const _contextValue = contextValue || ' ';
    return _contextValue.indexOf(' ') > -1;
  };

  const stringEmailHandler = function (contextValue) {
    const _contextValue = contextValue || '';
    const emailRegex = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;
    return !emailRegex.test(_contextValue);
  };

  const stringUrlHandler = function (contextValue) {
    const _contextValue = contextValue || '';
    const urlRegex = /^http[s]?:\/\/([\S]{3,})/;
    return !urlRegex.test(_contextValue);
  };

  const stringMobileHandler = function (contextValue) {
    const _contextValue = contextValue || '';
    const mobileRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    return !mobileRegex.test(_contextValue);
  };

  if ( typeof noGlobal === "undefined" ) {
    window.Vlee = Vlee;
  }

  return Vlee;
});
(function ( global, factory ) {
  const isModuleNode = typeof module === 'object' && typeof module.exports === 'object';
  if ( isModuleNode ) {
    module.exports = factory();
	} else {
		global.Vlee = factory();
	}
})(typeof window !== 'undefined' ? window : global, function () {

  // 외부 접근 인터페이스 정의
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
    dateString: function (value) {
      return new VDate(value);
    },
    object: function (value) {
      return new VObject(value);
    }
  };

  // 공통 룰 정의
  const RULES = {
    REQUIRED: 'REQUIRED',
    IS: 'IS',
    TYPE_INVALID: 'TYPE_INVALID',
    PATTERN: 'PATTERN',
    ACCEPT_VALUES: 'ACCEPT_VALUES',
    BIGGER: 'BIGGER',
    LESS: 'LESS',
    BIGGER_EQUAL: 'BIGGER_EQUAL',
    LESS_EQUAL: 'LESS_EQUAL',
    NOT_EMPTY: 'ARR_NOT_EMPTY',
  };

  //#region 공통 prototype 정의
  const VCommonType = function (value) {
    this.value = value;
    this.rules = [];
  };

  // static method 정의
  VCommonType.isVCommonType = function (value) {
    return value instanceof VCommonType;
  };

  VCommonType.prototype.addRule = function (vRule) {
    this.rules.push(vRule);
  };

  VCommonType.prototype.bindValue = function (value) {
    this.rules.forEach(function ( rule ) {
      if ( !VRule.isVRule(rule) ) return false;
      rule.setContextValue(value);
    });
  };
  
  VCommonType.prototype.required = function (message) {
    const defaultMessage = '['.concat(this.value, '] is required');
    this.addRule(VRule.of(RULES.REQUIRED, this.value, undefined, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VCommonType.prototype.pattern = function (pattern, message) {
    const defaultMessage = '['.concat(this.value, '] is not match pattern.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VCommonType.prototype.is = function (value, message) {
    const defaultMessage = '['.concat(this.value, '] is not ', value);
    this.addRule(VRule.of(RULES.IS, this.value, value, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VCommonType.prototype.validate = function () {
    const vErrors = new VError();

    this.rules.some(function ( rule ) {
      let condition = true;
      
      if ( !VRule.isVRule(rule) ) return false; // VRule이 아닌 rule (사용자가 임의로 넣은 rule) 에 대해서는 continue 처리로 skip
      if ( rule.hasTypeInvalid() ) condition = false;

      switch (rule['ruleType']) {
        case RULES.REQUIRED: condition = requiredHandler(rule.contextValue); break;
        case RULES.IS: condition = targetIsHandler(rule.contextValue, rule.targetValue); break;
        case RULES.PATTERN: condition = isRegexHandler(rule.contextValue, rule.targetValue); break;
        case RULES.NOT_EMPTY: condition = isNotEmptyHandler(rule.contextValue); break;
        case RULES.ACCEPT_VALUES: condition = isIncludeHandler(rule.targetValue, rule.contextValue); break;
        case RULES.BIGGER: condition = isBiggerThanHandler(rule.contextValue, rule.targetValue, false); break;
        case RULES.BIGGER_EQUAL: condition = isBiggerThanHandler(rule.contextValue, rule.targetValue, true); break;
        case RULES.LESS: condition = isLessThanHandler(rule.contextValue, rule.targetValue, false); break;
        case RULES.LESS_EQUAL: condition = isLessThanHandler(rule.contextValue, rule.targetValue, true); break;
      }

      if ( !condition ) vErrors.setError(rule.errorMessage, rule.contextValue);
      return VRule.isVRule(rule) && rule.hasTypeInvalid(); // 해당 rule이 type invalid rule type을 가졌을 때 break; 처리
    });
    
    return vErrors;
  };
  //#endregion

  //#region VString
  const VString = function (value) {
    this.constructor(value);
    const isValid = isNullOrUndefined(value) || isString(value);
    if (!isValid) this.addRule(VRule.of(RULES.TYPE_INVALID, value, null, 'Input Value is Not String Type Or Null. Cannot Compare Value.'));
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
    this.addRule(VRule.of(RULES.ACCEPT_VALUES, this.value, availableValueArray, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 문자열 최소길이 제한
   * @param {*} minLength 
   */
  VString.prototype.minLength = function (minLength, message) {
    const defaultMessage = '['.concat(this.value, '] length must exceed ', minLength);
    const _value = orElse(this.value, '');
    this.addRule(VRule.of(RULES.BIGGER, _value.length, minLength), notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 문자열 최대길이 제한
   * @param {number} maxLength 
   */
  VString.prototype.maxLength = function (maxLength, message) {
    const defaultMessage = '['.concat(this.value, '] length must not exceed ', maxLength);
    const _value = orElse(this.value, '');
    this.addRule(VRule.of(RULES.LESS, _value.length, maxLength), notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 공백이 포함되어있는지 확인한다.
   */
  VString.prototype.notBlank = function (message) {
    const pattern = /\s/;
    const defaultMessage = '['.concat(this.value, '] is include white space.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * '' 값인지 확인한다.
   */
  VString.prototype.notEmpty = function (message) {
    const defaultMessage = '['.concat( this.value, '] is empty.');
    this.addRule(VRule.of(RULES.NOT_EMPTY, this.value, undefined, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 이메일 형식인지 확인한다.
   */
  VString.prototype.email = function (message) {
    const pattern = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;
    const defaultMessage = '['.concat(this.value, '] is not email.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * URL 형식인지 확인한다.
   */
  VString.prototype.url = function (message) {
    const pattern = /^http[s]?:\/\/([\S]{3,})/;
    const defaultMessage = '['.concat(this.value, '] is not url.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 휴대폰 형식인지 확인한다.
   */
  VString.prototype.mobile = function (message) {
    const pattern = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    const defaultMessage = '['.concat(this.value, '] is not mobile.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 숫자로만 이루어져있는지 확인한다.
   */
  VString.prototype.onlyNumber = function (message) {
    const pattern = /\d$/;
    const defaultMessage = '['.concat(this.value, '] is accept only number.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this; 
  };

  /**
   * 화폐형식인지 확인한다.
   */
  VString.prototype.money = function (message) {
    const pattern = /^[1-9]\d{0,3}(,\d{0,3})*$/;
    const defaultMessage = '['.concat(this.value, '] is not money.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 숫자(소수점 허용)인지 확인한다.
   */
  VString.prototype.numeric = function (message) {
    const pattern = /^([1-9]{1,}|0?)[\.]?(\d){1,}$/;
    const defaultMessage = '['.concat(this.value, '] is not numeric.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 소문자로만 이루어져있는지 확인한다.
   */
  VString.prototype.lower = function (message) {
    const pattern = /[a-z]/;
    const defaultMessage = '['.concat(this.value, '] is not lower.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 대문자로만 이루어져있는지 확인한다.
   */
  VString.prototype.upper = function (message) {
    const pattern = /[A-Z]/;
    const defaultMessage = '['.concat(this.value, '] is not upper.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };
  //#endregion

  //#region VDate
  const VDate = function (value) {
    this.constructor(value);
    const isValid = isNullOrUndefined(value) || isDateString(value);
    if (!isValid) {
      const isNotValidMessage = 'Input Value ['.concat(value, '] is Not Convert Date Value. Cannot Compare Value.');
      this.addRule(VRule.of(RULES.TYPE_INVALID, value, null, isNotValidMessage));
    }
    return Object.freeze(this);
  };
  VDate.prototype = Object.create(VCommonType.prototype); // prototype 상속

  /**
   * 년월일 형식인지
   */
  VDate.prototype.date = function (message) {
    const pattern = /^\d{4}[-\.\/](0?\d|1[012])[-\.\/](0?[1-9]{1}|[12]\d|3[01])$/;
    const defaultMessage = '['.concat(this.value, '] is not date type.');
    this.addRule(VRule.of(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  /**
   * 년월일 시분 형식인지
   */
  VDate.prototype.datetime = function (message) {
    const pattern = /^\d{4}[-\.\/](0?\d|1[012])[-\.\/](0?\d|[12]\d|3[01])\s(0\d|1\d|2[0-3])(:[0-5][0-9]){1,2}/;
    const defaultMessage = '['.concat(this.value, '] is not date time type.');
    this.addRule(RULES.PATTERN, this.value, pattern, notStringMessageHandler(message, defaultMessage));
    return this;
  };

  /**
   * 비교할 대상보다 미래인지
   */
  VDate.prototype.after = function (targetValue, message) {
    const isValid = isDateString(targetValue);
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat(targetValue, '] is Not Convert Date Value. Cannot Compare Value.');
      this.addRule(VRule.of(RULES.TYPE_INVALID, this.value, targetValue, isNotValidMessage));
    } else {
      const defaultMessage = '['.concat(this.value, '] is not after [', targetValue,'].');
      this.addRule(VRule.of(RULES.BIGGER, new Date(this.value).getTime(), new Date(targetValue).getTime(), notStringMessageHandler(message, defaultMessage)));
    }
    return this;
  };

  /**
   * 비교할 대상보다 같거나 미래인지
   */
  VDate.prototype.equalAfter = function (targetValue, message) {
    const isValid = isDateString(targetValue);
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat(targetValue, '] is Not Convert Date Value. Cannot Compare Value.');
      this.addRule(VRule.of(RULES.TYPE_INVALID, this.value, targetValue, isNotValidMessage));
    } else {
      const defaultMessage = '['.concat(this.value, '] is not equal to or after [', targetValue,'].');
      this.addRule(VRule.of(RULES.BIGGER_EQUAL, new Date(this.value).getTime(), new Date(targetValue).getTime(), notStringMessageHandler(message, defaultMessage)));
    }
    return this;
  };

  /**
   * 비교할 대상보다 과거인지
   */
  VDate.prototype.before = function (targetValue, message) {
    const isValid = isDateString(targetValue);
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat(targetValue, '] is Not Convert Date Value. Cannot Compare Value.');
      this.addRule(VRule.of(RULES.TYPE_INVALID, this.value, targetValue, isNotValidMessage));
    } else {
      const defaultMessage = '['.concat(this.value, '] is not before [', targetValue,'].');
      this.addRule(VRule.of(RULES.LESS, new Date(this.value).getTime(), new Date(targetValue).getTime(), notStringMessageHandler(message, defaultMessage)));
    }
    return this;
  };

  /**
   * 비교할 대상보다 같거나 과거인지
   */
  VDate.prototype.equalBefore = function (targetValue, message) {
    const isValid = isDateString(targetValue);
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat(targetValue, '] is Not Convert Date Value. Cannot Compare Value.');
      this.addRule(VRule.of(RULES.TYPE_INVALID, this.value, targetValue, isNotValidMessage));
    } else {
      const defaultMessage = '['.concat(this.value, '] is not equal to or before [', targetValue,'].');
      this.addRule(VRule.of(RULES.LESS_EQUAL, new Date(this.value).getTime(), new Date(targetValue).getTime(), notStringMessageHandler(message, defaultMessage)));
    }
    return this;
  };
  //#endregion

  //#region VNumber
  const VNumber = function (value) {
    this.constructor(value);
    const isValid = isNullOrUndefined(value) || isNumber(value);
    if (!isValid) this.addRule(VRule.of(RULES.TYPE_INVALID, value, null, 'Input Value is Not Number Type Or Null. Cannot Compare Value.'));
    return Object.freeze(this);
  };
  VNumber.prototype = Object.create(VCommonType.prototype); // prototype 상속

  VNumber.prototype.values = function (availableValueArray, message) {
    const valuesMessage = isArray(availableValueArray) ? availableValueArray.join(', ') : availableValueArray;
    const defaultMessage = '['.concat( this.value, '] is only available in [', valuesMessage, '].' );
    this.addRule(VRule.of(RULES.ACCEPT_VALUES, this.value, availableValueArray, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VNumber.prototype.bigger = function (targetValue, message) {
    const defaultMessage = '['.concat( this.value, '] is not bigger than [', targetValue, '].');
    this.addRule(VRule.of(RULES.BIGGER, this.value, targetValue, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VNumber.prototype.biggerEquals = function (targetValue, message) {
    const defaultMessage = '['.concat( this.value, '] is not bigger than or equal to [', targetValue, '].');
    this.addRule(VRule.of(RULES.BIGGER_EQUAL, this.value, targetValue, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VNumber.prototype.less = function (targetValue, message) {
    const defaultMessage = '['.concat( this.value, '] is not less than [', targetValue, '].');
    this.addRule(VRule.of(RULES.LESS, this.value, targetValue, notStringMessageHandler(message, defaultMessage)));
    return this;
  };

  VNumber.prototype.lessEquals = function (targetValue, message) {
    const defaultMessage = '['.concat( this.value, '] is not less than or equal to [', targetValue, '].');
    this.addRule(VRule.of(RULES.LESS_EQUAL, this.value, targetValue, notStringMessageHandler(message, defaultMessage)));
    return this;
  };
  //#endregion

  //#region VArray
  const VArray = function (value) {
    this.constructor(value);
    const isValid = isNullOrUndefined(value) || isArray(value);
    if ( !isValid ) this.addRule(VRule.of(RULES.TYPE_INVALID, value, null, 'Input Value is Not Array Type Or Null. Cannot Compare Value.'));
    return Object.freeze(this);
  };
  VArray.prototype = Object.create(VCommonType.prototype); // prototype 상속

  VArray.prototype.notEmpty = function (message) {
    const defaultMessage = '['.concat( this.value, '] is empty.');
    this.addRule(VRule.of(RULES.NOT_EMPTY, this.value, undefined, notStringMessageHandler(message, defaultMessage)));
    return this;
  };
  //#endregion

  //#region VObject
  const VObject = function (objectSchema) {
    if ( !isObject(objectSchema) ) throw new Error('argument is not object type.');
    this.schema = objectSchema;
    return Object.freeze(this);
  };

  VObject.prototype.validate = function (target) {
    if ( !isObject(target) ) {
      console.error('target type is not object.');
      return null;
    }
    const self = this;
    const totalVErrors = new VError();
    Object.keys(self.schema).forEach(function (key) {
      if ( !target.hasOwnProperty(key) ) return false;  // 유효성을 체크하려는 대상에게 해당 키가 존재하지 않으면 continue
      const schemaRule = self.schema[key];
      if ( !VCommonType.isVCommonType(schemaRule) ) return false; // schemaRule 이 공통 VCommonType을 확장한 함수의 인스턴스가 아니면 continue (외부 조작 방지)
      const targetValue = target[key]; // 대상 키의 값
      schemaRule.bindValue(targetValue);  // VRule의 contextValue에 값 바인딩
      const vErrors = schemaRule.validate();  // 각 VRule 유효성 체크
      if (vErrors.hasErrors) totalVErrors.pushError(vErrors.errors); // VRule이 에러를 가질 시만 
    });
    return totalVErrors;
  };
  //#endregion

  //#region VRule 규칙 정의 객체
  const VRule = function (ruleType, contextValue, targetValue, errorMessage) {
    this.ruleType = ruleType;
    this.contextValue = contextValue;
    this.targetValue = targetValue;
    this.errorMessage = errorMessage;
    return this;
  };

  /**
   * 인스턴스 생성 static method
   */
  VRule.of = function (ruleType, contextValue, targetValue, errorMessage) {
    return new VRule(ruleType, contextValue, targetValue, errorMessage);
  };
  
  /**
   * 자신의 instance 인지 확인 
   */
  VRule.isVRule = function (target) {
    return target instanceof VRule;
  };

  /**
   * type이 맞지 않는 rule이 인지 확인
   */
  VRule.prototype.hasTypeInvalid = function () {
    return this.ruleType === RULES.TYPE_INVALID;
  };

  /**
   * contextValue 설정
   */
  VRule.prototype.setContextValue = function (value) {
    this.contextValue = value;
  };
  //#endregion

  //#region 에러 관련 객체
  const VError = function () {
    this.hasErrors = false;
    this.errors = [];
    return this;
  };

  VError.prototype.setError = function (message, refContext) {
    if (!this.hasErrors) this.hasErrors = true;
    this.errors.push(new VErrorMessage(message, refContext));
  };

  VError.prototype.pushError = function (vErrorMessageList) {
    if (!this.hasErrors) this.hasErrors = true;
    this.errors = this.errors.concat(vErrorMessageList);
  };
  //#endregion

  //#region 에러 메세지 객체
  const VErrorMessage = function (message, refContext) {
    this.message = message;
    this.ref = refContext;
    return Object.freeze(this);
  };

  VErrorMessage.isVErrorMessage = function (value) {
    console.log(value instanceof VErrorMessage);
    return value instanceof VErrorMessage;
  };

  VErrorMessage.prototype.toString = function () {
    return this.message;
  };
  //#endregion

  //#region Util Functions
  const orElse = function (value, replaceValue) {
    if (isNullOrUndefined( replaceValue )) throw new Error('replace value is not Null or Undefined');
    return isNullOrUndefined( value ) ? replaceValue : value;
  };

  const isNullOrUndefined = function (val) {
    return val === null || val === undefined;
  };

  const isString = function (val) {
    return objectToStringCall(val) === '[object String]';
  };

  const isNumber = function (val) {
    return objectToStringCall(val) === '[object Number]';
  };

  const isArray = function (val) {
    return Array.isArray(val);
  };

  const isObject = function (val) {
    return objectToStringCall(val) === '[object Object]';
  };

  const isDateString = function (val) {
    const date = new Date(val);
    return objectToStringCall(date) === '[object Date]' && !isNaN(date) && !isNullOrUndefined(val);
  };

  const objectToStringCall = function (val) {
    return Object.prototype.toString.call(val);
  };

  const notStringMessageHandler = function (customMessage, defaultMessage) {
    return isString(customMessage) ? customMessage : defaultMessage;
  };
  //#endregion

  //#region rule handler
  const requiredHandler = function (contextValue) {
    return !isNullOrUndefined(contextValue);
  };

  const targetIsHandler = function (contextValue, targetValue) {
    return contextValue === targetValue;
  };

  const isNotEmptyHandler = function (contextValue) {
    return requiredHandler(contextValue) &&
    (
      ( (isString(contextValue) || isArray(contextValue)) && !!contextValue.length ) ||
      ( isObject(contextValue) && !!Object.keys(contextValue).length )
    );
  };

  const isIncludeHandler = function (list, value) {
    const _list = orElse(list, []);
    const _value = orElse(value, '');
    return _list.indexOf(_value) >= 0;
  };

  const isBiggerThanHandler = function (source, target, isIncludeEqual) {
    const _source = orElse(source, 0);
    const _target = orElse(target, 0);
    return isIncludeEqual ? _source >= _target : _source > _target;
  };

  const isLessThanHandler = function (source, target, isIncludeEqual) {
    const _source = orElse(source, 0);
    const _target = orElse(target, 0);
    return isIncludeEqual ? _source <= _target : _source < _target;
  };

  const isRegexHandler = function (source, pattern) {
    return pattern.test(source) && !isNullOrUndefined(source);
  };
  //#endregion

  return Vlee;
});
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
    string: function () {
      return new VString();
    },
    number: function () {
      return new VNumber();
    },
    array: function () {
      return new VArray();
    },
    dateString: function () {
      return new VDate();
    },
    object: function ( schema ) {
      return new VObject( schema );
    },
    when: function ( targetKey ) {
      return new VWhen( targetKey );
    },
    then: function ( targetKey ) {
      return new VThen( targetKey );
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
    NOT_EMPTY: 'NOT_EMPTY',
    MIN_LENGTH: 'MIN_LENGTH',
    MAX_LENGTH: 'MAX_LENGTH'
  };

  //#region 공통 prototype 정의
  const VCommonType = function () {
    this.rules = [];
  };

  // VCommonType 인스턴스인지 확인하는 static method 정의
  VCommonType.isVCommonType = function ( arg ) {
    return arg instanceof VCommonType;
  };

  /**
   * rule 추가
   */
  VCommonType.prototype.addRule = function ( vRule ) {
    if ( VRule.isVRule( vRule ) ) {
      this.rules.push( vRule );
    }
  };

  /**
   * contextValue 주입
   */
  VCommonType.prototype.bindValue = function ( contextValue ) {
    this.rules.forEach(function ( rule ) {
      if ( !VRule.isVRule( rule ) ) return false;
      rule.setContextValue( contextValue );
    });
  };
  
  /**
   * 공통 required 룰 정의
   */
  VCommonType.prototype.required = function ( message ) {
    const defaultMessage = '[{{ contextValue }}] is required.';
    const vRuleInstance = VRule.of( RULES.REQUIRED, undefined, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 공통 커스텀 정규식과 일치하는지 적용
   * @param {*} pattern 패턴 작성 ex) /\d/
   */
  VCommonType.prototype.pattern = function ( pattern, message ) {
    if ( !isRegExp ( pattern ) ) throw new Error(' arg that first argument in pattern method is not RegExp. first arugment must be RegExp Type.');
    const defaultMessage = '[{{ contextValue }}] is not match pattern.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 값이 같은지 체크
   * @param {*} targetValue 비교할 대상 값
   */
  VCommonType.prototype.is = function ( targetValue, message ) {
    const defaultMessage = '[{{ contextValue }}] is not ' + targetValue;
    const vRuleInstance = VRule.of( RULES.IS, value, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 값 정의 
   * @param {*} contextValue 
   */
  VCommonType.prototype.validate = function ( contextValue ) {
    const vErrors = new VError();

    let isTypeValid = false;
    let typeInvalidMessage = '';

    // 각 타입별로 비교할 타입이 아닌지 체크
    if ( VString.isVstring( this ) ) {

      isTypeValid = isNullOrUndefined( contextValue ) || isString( contextValue );
      typeInvalidMessage = 'Input Context Value Type Must Be String Type Or Null. Cannot Compare Value.';

    } else if ( VDate.isVDate( this ) ) {

      isTypeValid = isNullOrUndefined( contextValue ) || isDateString( contextValue );
      typeInvalidMessage = 'Input Context Value Is Not Convert Date. Cannot Compare Value.';

    } else if ( VNumber.isVNumber( this ) ) {

      isTypeValid = isNullOrUndefined( contextValue ) || isNumber( contextValue );
      typeInvalidMessage = 'Input Value is Not Number Type Or Null. Cannot Compare Value.';

    } else if ( VArray.isVArray( this ) ) {
      
      isTypeValid = isNullOrUndefined( contextValue ) || isArray( contextValue );
      typeInvalidMessage = 'Input Value is Not Array Type Or Null. Cannot Compare Value.';

    } else if ( VObject.isVObject( this ) ) {

      isTypeValid = isObject( contextValue );
      typeInvalidMessage = 'Input Value is Not Object Type. Cannot Compare Value.';

    }

    if ( !isTypeValid ) {
      const vRuleInstance = VRule.of( RULES.TYPE_INVALID, contextValue, undefined, typeInvalidMessage );
      this.rules.unshift( vRuleInstance );
    }

    if ( VObject.isVObject( this ) && isTypeValid ) {
      const self = this;
      Object.keys( self.schema ).forEach( function ( key ) {
        if ( !contextValue.hasOwnProperty( key ) ) return false; // 유효성을 체크하려는 대상에게 해당 키가 존재하지 않으면 continue
        const vCommonTypeInstance = self.schema[ key ];
        if ( !VCommonType.isVCommonType( vCommonTypeInstance ) ) return false;  // schemaRule 이 공통 VCommonType을 확장한 함수의 인스턴스가 아니면 continue (외부 조작 방지)
        const contextTargetValue = contextValue[ key ]; // 인자 객체의 키값
        vCommonTypeInstance.bindValue( contextTargetValue );  // VRule contextValue에 값 바인딩
        const _vErrors = vCommonTypeInstance.validate(); // 각 VRule 유효성 체크
        if ( _vErrors.hasErrors ) vErrors.pushError( _vErrors.errors );
      });
    }

    this.rules.some(function ( rule ) {
      let condition = true;
      
      if ( !VRule.isVRule(rule) ) return false; // VRule이 아닌 rule (사용자가 임의로 넣은 rule) 에 대해서는 continue 처리로 skip
      if ( rule.hasTypeInvalid() ) condition = false;
      
      rule.setContextValue( contextValue );

      switch (rule['ruleType']) {

        case RULES.REQUIRED: condition = requiredHandler( rule.contextValue ); break;
        case RULES.IS: condition = targetIsHandler( rule.contextValue, rule.targetValue ); break;
        case RULES.PATTERN: condition = isRegexHandler( rule.contextValue, rule.targetValue ); break;
        case RULES.NOT_EMPTY: condition = isNotEmptyHandler( rule.contextValue ); break;
        case RULES.ACCEPT_VALUES: condition = isIncludeHandler( rule.targetValue, rule.contextValue ); break;
        case RULES.BIGGER: condition = isBiggerThanHandler( rule.contextValue, rule.targetValue, false ); break;
        case RULES.BIGGER_EQUAL: condition = isBiggerThanHandler( rule.contextValue, rule.targetValue, true ); break;
        case RULES.LESS: condition = isLessThanHandler( rule.contextValue, rule.targetValue, false ); break;
        case RULES.LESS_EQUAL: condition = isLessThanHandler( rule.contextValue, rule.targetValue, true ); break;
        case RULES.MAX_LENGTH: condition = isLessThanHandler( orElse( rule.contextValue, '' ).length, rule.targetValue, true ); break;
        case RULES.MIN_LENGTH: condition = isBiggerThanHandler( orElse( rule.contextValue, '' ).length, rule.targetValue, true ); break;

      }

      if ( !condition ) vErrors.setError(rule.errorMessage, rule.contextValue);
      return VRule.isVRule(rule) && rule.hasTypeInvalid(); // 해당 rule이 type invalid rule type을 가졌을 때 break; 처리
    });
    
    return vErrors;
  };
  //#endregion

  //#region VString
  const VString = function () {
    this.constructor();
    return Object.freeze(this);
  };

  // VString instance check
  VString.isVstring = function ( arg ) {
    return arg instanceof VString;
  };

  // prototype 상속
  VString.prototype = Object.create(VCommonType.prototype);

  /**
   * 허용가능한 값 정의
   * @param {*} availableValueArray 허용 가능한 값을 배열상태로 정의. 예: ['a', 'b', 'c']
   */
  VString.prototype.values = function ( availableValueArray, message ) {
    const valuesMessage = isArray( availableValueArray ) ? availableValueArray.join(', ') : availableValueArray;
    const defaultMessage = '[{{ contextValue }}] is only available in ['.concat( valuesMessage, '].');
    const vRuleInstance = VRule.of( RULES.ACCEPT_VALUES, availableValueArray, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 문자열 최소길이 제한
   * @param {*} minLength 
   */
  VString.prototype.min = function ( minLength, message ) {
    const defaultMessage = '[{{ contextValue }}] length must exceed ' + minLength + '.';
    const vRuleInstance = VRule.of( RULES.MIN_LENGTH, minLength, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 문자열 최대길이 제한
   * @param {number} maxLength 
   */
  VString.prototype.max = function ( maxLength, message ) {
    const defaultMessage = '[{{ contextValue }}] must not exceed ' + maxLength + '.';
    const vRuleInstance = VRule.of( RULES.MAX_LENGTH, maxLength, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 공백이 포함되어있는지 확인한다.
   */
  VString.prototype.blank = function ( message ) {
    const pattern = /^\S\S*\S$/;
    const defaultMessage = '[{{ contextValue }}] is include white space.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * '' 값인지 확인한다.
   */
  VString.prototype.empty = function ( message ) {
    const defaultMessage = '[{{ contextValue }}] is empty.';
    const vRuleInstance = VRule.of( RULES.NOT_EMPTY, undefined, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 이메일 형식인지 확인한다.
   */
  VString.prototype.email = function ( message ) {
    const pattern = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/;
    const defaultMessage = '[{{ contextValue }}] is not email.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * URL 형식인지 확인한다.
   */
  VString.prototype.url = function ( message ) {
    const pattern = /^http[s]?:\/\/([\S]{3,})/;
    const defaultMessage = '[{{ contextValue }}] is not url.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 휴대폰 형식인지 확인한다.
   */
  VString.prototype.mobile = function ( message ) {
    const pattern = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
    const defaultMessage = '[{{ contextValue }}] is not mobile.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 숫자로만 이루어져있는지 확인한다.
   */
  VString.prototype.onlyNumber = function ( message ) {
    const pattern = /^\d\d*\d$/;
    const defaultMessage = '[{{ contextValue }}] is accept only number.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler(message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this; 
  };

  /**
   * 화폐형식인지 확인한다.
   */
  VString.prototype.money = function ( message ) {
    const pattern = /^[1-9]\d{0,3}(,\d{0,3})*$/;
    const defaultMessage = '[{{ contextValue }}] is not money.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 숫자(소수점 허용)인지 확인한다.
   */
  VString.prototype.numeric = function ( message ) {
    const pattern = /^(0|[1-9]\d*)(\.\d*[1-9]$|\d$)/; // 0 혹은 0 이 아닌 숫자로 시작하고 중간에 숫자 여러개가 있고 콤마가 있는 경우 0으로 끝나서는 안되고 콤마가 없을 경우는 어떤 숫자로 끝나는 것을 허용.
    const defaultMessage = '[{{ contextValue }}] is not numeric.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 소문자로만 이루어져있는지 확인한다.
   */
  VString.prototype.lower = function ( message ) {
    const pattern = /^[a-z][a-z]*[a-z]$/;
    const defaultMessage = '[{{ contextValue }}] is not lower.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 대문자로만 이루어져있는지 확인한다.
   */
  VString.prototype.upper = function ( message ) {
    const pattern = /^[A-Z][A-Z]*[A-Z]$/;
    const defaultMessage = '[{{ contextValue }}] is not upper.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };
  //#endregion

  //#region VDate
  const VDate = function () {
    this.constructor();
    return Object.freeze(this);
  };

  // VDate instance check
  VDate.isVDate = function ( arg ) {
    return arg instanceof VDate;
  };

  // prototype 상속
  VDate.prototype = Object.create(VCommonType.prototype);

  /**
   * 년월일 형식인지
   */
  VDate.prototype.date = function ( message ) {
    const pattern = /^\d{4}[-\.\/](0?\d|1[012])[-\.\/](0?[1-9]{1}|[12]\d|3[01])$/;
    const defaultMessage = '[{{ contextValue }}] is not date type.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 년월일 시분 형식인지
   */
  VDate.prototype.datetime = function ( message ) {
    const pattern = /^\d{4}[-\.\/](0?\d|1[012])[-\.\/](0?\d|[12]\d|3[01])\s(0\d|1\d|2[0-3])(:[0-5][0-9]){1,2}/;
    const defaultMessage = '[{{ contextValue }}] is not date time type.';
    const vRuleInstance = VRule.of( RULES.PATTERN, pattern, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 비교할 대상보다 미래인지
   */
  VDate.prototype.after = function ( targetValue, message ) {
    const isValid = !isNullOrUndefined( targetValue ) || isDateString( targetValue );
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat( targetValue, '] is Not Convert Date Value. Cannot Compare Value.' );
      const vRuleInstance = VRule.of( RULES.TYPE_INVALID, targetValue, isNotValidMessage );
      this.addRule( vRuleInstance );
    } else {
      const defaultMessage = '[{{ contextValue }}] is not after [' + targetValue + ']';
      const vRuleInstance = VRule.of(RULES.BIGGER, targetValue, notStringMessageHandler( message, defaultMessage ) )
      this.addRule( vRuleInstance );
    }
    return this;
  };

  /**
   * 비교할 대상보다 같거나 미래인지
   */
  VDate.prototype.equalAfter = function ( targetValue, message ) {
    const isValid = !isNullOrUndefined( targetValue ) || isDateString( targetValue );
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat( targetValue, '] is Not Convert Date Value. Cannot Compare Value.' );
      const vRuleInstance = VRule.of( RULES.TYPE_INVALID, targetValue, isNotValidMessage );
      this.addRule( vRuleInstance );
    } else {
      const defaultMessage = '[{{ contextValue }}] is not equal to or after [' + targetValue + ']';
      const vRuleInstance = VRule.of( RULES.BIGGER_EQUAL, targetValue, notStringMessageHandler( message, defaultMessage ) );
      this.addRule( vRuleInstance );
    }
    return this;
  };

  /**
   * 비교할 대상보다 과거인지
   */
  VDate.prototype.before = function ( targetValue, message ) {
    const isValid = !isNullOrUndefined( targetValue ) || isDateString( targetValue );
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat( targetValue, '] is Not Convert Date Value. Cannot Compare Value.' );
      const vRuleInstance = VRule.of( RULES.TYPE_INVALID, targetValue, isNotValidMessage );
      this.addRule( vRuleInstance );
    } else {
      const defaultMessage = '[{{ contextValue }}] is not before [' + targetValue + ']';
      const vRuleInstance = VRule.of( RULES.LESS, targetValue, notStringMessageHandler( message, defaultMessage ) );
      this.addRule( vRuleInstance );
    }
    return this;
  };

  /**
   * 비교할 대상보다 같거나 과거인지
   */
  VDate.prototype.equalBefore = function (targetValue, message) {
    const isValid = !isNullOrUndefined( targetValue ) || isDateString( targetValue );
    if (!isValid) {
      const isNotValidMessage = 'Target Value ['.concat( targetValue, '] is Not Convert Date Value. Cannot Compare Value.' );
      const vRuleInstance = VRule.of( RULES.TYPE_INVALID, targetValue, isNotValidMessage );
      this.addRule( vRuleInstance );
    } else {
      const defaultMessage = '[{{ contextValue }}] is not before [' + targetValue + ']';
      const vRuleInstance = VRule.of( RULES.LESS_EQUAL, targetValue, notStringMessageHandler( message, defaultMessage ) );
      this.addRule( vRuleInstance );
    }
    return this;
  };
  //#endregion

  //#region VNumber
  const VNumber = function () {
    this.constructor();
    return Object.freeze(this);
  };

  // vnumber instance check
  VNumber.isVNumber = function ( arg ) {
    return arg instanceof VNumber;
  };

  // prototype 상속
  VNumber.prototype = Object.create( VCommonType.prototype );

  /**
   * 허용가능한 값 정의
   * @param {*} availableValueArray 허용 가능한 값을 배열상태로 정의. 예: [1, 2, 3]
   */
  VNumber.prototype.values = function ( availableValueArray, message ) {
    const valuesMessage = isArray( availableValueArray ) ? availableValueArray.join(', ') : availableValueArray;
    const defaultMessage = '[{{ contextValue }}] is only available in ['.concat( valuesMessage, '].');
    const vRuleInstance = VRule.of( RULES.ACCEPT_VALUES, availableValueArray, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 비교대상값보다 큰 값인지 체크.
   */
  VNumber.prototype.bigger = function ( targetValue, message ) {
    const defaultMessage = '[{{ contextValue }}] is not bigger than [' + targetValue + '].';
    const vRuleInstance = VRule.of( RULES.BIGGER, targetValue, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 비교대상값보다 큰 값이거나 같은지 체크.
   */
  VNumber.prototype.biggerEquals = function ( targetValue, message ) {
    const defaultMessage = '[{{ contextValue }}] is not bigger than or equal to [' + targetValue + '].';
    const vRuleInstance = VRule.of( RULES.BIGGER_EQUAL, targetValue, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 비교대상보다 작은 값인지
   */
  VNumber.prototype.less = function ( targetValue, message ) {
    const defaultMessage = '[{{ contextValue }}] is not less than [' + targetValue + '].';
    const vRuleInstance = VRule.of( RULES.LESS, targetValue, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };

  /**
   * 비교대상보다 작은 값이거나 같은지 체크.
   */
  VNumber.prototype.lessEquals = function ( targetValue, message ) {
    const defaultMessage = '[{{ contextValue }}] is not less than or equal to [' + targetValue + '].';
    const vRuleInstance = VRule.of( RULES.LESS_EQUAL, targetValue, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };
  //#endregion

  //#region VArray
  const VArray = function () {
    this.constructor();
    return Object.freeze(this);
  };

  // VArray instance check
  VArray.isVArray = function ( arg ) {
    return arg instanceof VArray;
  };

  // prototype 상속
  VArray.prototype = Object.create(VCommonType.prototype);

  /**
   * 배열이 비어있는지 확인.
   */
  VArray.prototype.empty = function (message) {
    const defaultMessage = '[{{ contextValue }}] is empty.';
    const vRuleInstance = VRule.of( RULES.NOT_EMPTY, undefined, notStringMessageHandler( message, defaultMessage ) );
    this.addRule( vRuleInstance );
    return this;
  };
  //#endregion

  //#region VObject
  const VObject = function ( objectSchema ) {
    if ( !isObject( objectSchema ) ) throw new Error(' argument is not object type. ');
    this.constructor();
    this.schema = objectSchema;
    return Object.freeze(this);
  };

  // VObject instance check
  VObject.isVObject = function ( arg ) {
    return arg instanceof VObject;
  };

  // prototype 상속
  VObject.prototype = Object.create( VCommonType.prototype );

  /**
   * When Then Else 를 쓸 수 있는 파이프 제공
   */
  VObject.prototype.pipe = function ( vWhen, vThen, vElse ) {

    console.log( vWhen );
    console.log( vThen );
    console.log( vElse );

    return this;
  };
  //#endregion

  //#region VWhen
  const VWhen = function ( targetKey ) {
    this.targetKey = targetKey;
    this.rules = [];
    return Object.freeze(this);
  };

  // VWhen instance check
  VWhen.isVWhen = function ( arg ) {
    return arg instanceof VWhen;
  };

  VWhen.prototype.is = function ( checkValue ) {
    const vRuleInstance = VRule.of( RULES.IS, checkValue, undefined );
    this.rules.push( vRuleInstance );
    return this;
  };
  //#endregion VWhen

  //#region VThen
  const VThen = function ( targetKey ) {
    this.targetKey = targetKey;
    this.rules = [];
    return Object.freeze(this);
  }

  // VThen instance check
  VThen.isVThen = function ( arg ) {
    return arg instanceof VThen;
  };

  VThen.prototype.after = function ( checkValue, message ) {
    const defaultMessage = '[ '.concat( this.targetKey, ' ] is not after ' + checkValue );
    const vRuleInstance = VRule.of( RULES.BIGGER, checkValue, notStringMessageHandler( message, defaultMessage ) );
    this.rules.push( vRuleInstance );
    return this;
  };

  //#region VRule 규칙 정의 객체
  const VRule = function ( ruleType, targetValue, errorMessage ) {
    this.ruleType = ruleType;
    this.contextValue = undefined;
    this.targetValue = targetValue;
    this.errorMessage = errorMessage;
    return this;
  };

  /**
   * 인스턴스 생성 static method
   */
  VRule.of = function ( ruleType, targetValue, errorMessage ) {
    return new VRule( ruleType, targetValue, errorMessage );
  };
  
  /**
   * 자신의 instance 인지 확인 
   */
  VRule.isVRule = function ( target ) {
    return target instanceof VRule;
  };

  /**
   * type이 맞지 않는 rule이 인지 확인
   */
  VRule.prototype.hasTypeInvalid = function () {
    return this.ruleType === RULES.TYPE_INVALID;
  };

  /**
   * contextValue 설정 및 메세지 변경
   */
  VRule.prototype.setContextValue = function ( contextValue ) {
    this.contextValue = contextValue;
    const messageContextValue = contextValue === '' ? '(empty string)' : contextValue === [] ? '(empty array)' : contextValue;
    this.errorMessage = this.errorMessage.replace(/\{\{ contextValue \}\}/, messageContextValue);
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

  const isRegExp = function ( val ) {
    return val instanceof RegExp;
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

  const isLessThanHandler = function ( source, target, isIncludeEqual ) {
    const _source = orElse(source, 0);
    const _target = orElse(target, 0);
    return isIncludeEqual ? _source <= _target : _source < _target;
  };

  const isRegexHandler = function (source, pattern, isNotMatch) {
    return !isNullOrUndefined(source) &&
      (
        isNotMatch ? !pattern.test(source) : pattern.test(source)
      );
  };
  //#endregion

  return Vlee;
});
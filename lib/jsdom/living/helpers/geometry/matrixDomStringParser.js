"use strict";
const cssTree = require("css-tree");

function validateParameterLength(expectedLength, params, fnName = "") {
  const isValidLength = Array.isArray(expectedLength) ?
    params.length >= expectedLength[0] && params.length <= expectedLength[1] :
    params.length === expectedLength;

  if (!isValidLength) {
    throw new TypeError(`Received invalid number of parameters for function ${fnName}`);
  }
}

// https://drafts.csswg.org/css-transforms-1/#typedef-transform-function
// https://drafts.csswg.org/css-transforms-2/#three-d-transform-functions
const transformFunctionNames = Object.keys(transformFnParamValidation);

// https://drafts.csswg.org/css-values-4/#absolute-lengths
const absoluteLengths = ["cm", "mm", "q", "in", "pc", "pt", "px"];
const LENGTH_CONVERTERS = {
  cm(x) {
    return this.in(x) / 2.54;
  },
  mm(x) {
    return this.cm(x) / 10;
  },
  q(x) {
    return this.cm(x) / 40;
  },
  in(x) {
    return x * 96;
  },
  pc(x) {
    return this.in(x) / 6;
  },
  pt(x) {
    return this.in(x) / 72;
  },
  px(x) {
    return x;
  }
};

// https://drafts.csswg.org/css-values-4/#angles
const angleUnits = ["deg", "grad", "rad", "turn"];
const ANGLE_CONVERTERS = {
  deg(x) {
    return x;
  },
  grad(x) {
    return this.turn(x) / 400;
  },
  rad(x) {
    return x * (180 / Math.PI);
  },
  turn(x) {
    return x * 360;
  }
};

function convertDimension(value, unit) {
  if (absoluteLengths.includes(unit)) {
    return LENGTH_CONVERTERS[unit](value);
  } else if (angleUnits.includes(unit)) {
    return ANGLE_CONVERTERS[unit](value);
  }

  throw new TypeError(`Received unknown dimension unit ${unit}`);
}

function assertTypeConverter(expectation) {
  return nodeData => {
    const { unit, value, type } = nodeData;

    if (!expectation(nodeData)) {
      throw new TypeError(`Received an unexpected param: ${type} ${unit}`);
    }

    if (nodeData.type === "Number") {
      return Number(value);
    }

    return convertDimension(Number(value), unit);
  };
}

const assertNumberConverter =
  assertTypeConverter(nodeData => nodeData.type === "Number");

const assertAbsoluteLengthConverter =
  assertTypeConverter(nodeData => nodeData.type === "Dimension" &&
    absoluteLengths.includes(nodeData.unit.toLowerCase()));

const assertAngleConverter =
  assertTypeConverter(nodeData => nodeData.type === "Dimension" &&
    angleUnits.includes(nodeData.unit.toLowerCase()));

// https://drafts.csswg.org/css-transforms-1/#two-d-transform-functions
// https://drafts.csswg.org/css-transforms-2/#three-d-transform-functions

// Contains the definitions for valid parameters per transform function.
// Preforms conversion of parameters to expected values.
const transformFnParamValidation = {
  matrix3d: (...params) => {
    validateParameterLength(16, params, "matrix3d");
    return params.map(assertNumberConverter);
  },
  matrix: (...params) => {
    validateParameterLength(6, params, "matrix");
    return params.map(assertNumberConverter);
  },
  translate3d: (...params) => {
    validateParameterLength(3, params, "translate3d");
    return params.map(assertAbsoluteLengthConverter);
  },
  translate: (...params) => {
    validateParameterLength([1, 2], params, "translate");
    return params.map(assertAbsoluteLengthConverter);
  },
  translateX: (...params) => {
    validateParameterLength(1, params, "translateX");
    return params.map(assertAbsoluteLengthConverter);
  },
  translateY: (...params) => {
    validateParameterLength(1, params, "translateY");
    return params.map(assertAbsoluteLengthConverter);
  },
  translateZ: (...params) => {
    validateParameterLength(1, params, "translateZ");
    return params.map(assertAbsoluteLengthConverter);
  },
  scale3d: (...params) => {
    validateParameterLength(3, params, "scale3d");
    return params.map(assertNumberConverter);
  },
  scale: (...params) => {
    validateParameterLength([1, 2], params, "scale");
    return params.map(assertNumberConverter);
  },
  scaleX: (...params) => {
    validateParameterLength(1, params, "scaleX");
    return params.map(assertNumberConverter);
  },
  scaleY: (...params) => {
    validateParameterLength(1, params, "scaleY");
    return params.map(assertNumberConverter);
  },
  scaleZ: (...params) => {
    validateParameterLength(1, params, "scaleX");
    return params.map(assertNumberConverter);
  },
  rotate3d: (...params) => {
    validateParameterLength(4, params, "rotate3d");
    return [
      ...params.slice(0, 3).map(assertNumberConverter),
      assertAngleConverter(params[3])
    ];
  },
  rotate: (...params) => {
    validateParameterLength(1, params, "rotate");
    return params.map(assertAngleConverter);
  },
  rotateX: (...params) => {
    validateParameterLength(1, params, "rotateX");
    return params.map(assertAngleConverter);
  },
  rotateY: (...params) => {
    validateParameterLength(1, params, "rotateY");
    return params.map(assertAngleConverter);
  },
  rotateZ: (...params) => {
    validateParameterLength(1, params, "rotateZ");
    return params.map(assertAngleConverter);
  },
  perspective: (...params) => {
    validateParameterLength(1, params, "perspective");
    return params.map(assertAbsoluteLengthConverter);
  },
  skew: (...params) => {
    validateParameterLength([1, 2], params, "skew");
    return params.map(assertAngleConverter);
  },
  skewX: (...params) => {
    validateParameterLength(1, params, "skewX");
    return params.map(assertAngleConverter);
  },
  skewY: (...params) => {
    validateParameterLength(1, params, "skewY");
    return params.map(assertAngleConverter);
  }
};

function fnVisitor(node) {
  const name = node.data.name.toLowerCase();
  const { children } = node.data;

  // TODO: Evaluate calc, for now throw a type error
  if (!transformFunctionNames.includes(name.toLowerCase())) {
    throw new TypeError(`invalid transform function ${name}`);
  }

  const params = [];

  let next = children.head;

  while (next) {
    switch (next.data.type) {
      case "WhiteSpace": break;
      case "Function": {
        params.push(fnVisitor(node.data.children.head));
        break;
      }
      // default : console.log(node.data.type, node.data.name);
      case "Percentage":
        throw new TypeError("Lengths must be absolute, not relative.");
      case "Dimension":
      case "Number":
        params.push(next.data);
    }

    next = next.next;
  }

  return {
    name,
    params: transformFnParamValidation[name](...params)
  };
}

function visitor(node) {
  if (node.type === "Value") {
    const fnList = [];
    let walk = node.children.head;
    while (walk) {
      switch (walk.data.type) {
        case "WhiteSpace": break;
        case "Function": {
          fnList.push(fnVisitor(walk));
          break;
        }
        default:
          throw new TypeError(`Encountered an unexpected node type ${walk.data.type}`);
      }
      walk = walk.next;
    }

    return fnList;
  }

  throw new TypeError(`Encountered an unexpected node type ${node.type}`);
}

exports.parseDOMStringToMatrixFunctions = function (domString) {
  try {
    return visitor(cssTree.parse(domString, {
      context: "value",
      onParseError(e) {
        throw e;
      }
    }));
  } catch (e) {
    throw new TypeError(`Failed to parse DOMString ${e.stack}`);
  }
};

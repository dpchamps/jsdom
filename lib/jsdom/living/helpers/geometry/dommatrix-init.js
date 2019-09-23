"use strict";

const { matrix2dArrayProperties, matrix3dArrayProperties } = require("./matrix");

const aliasedProperties = [
  ["a", "m11", 1],
  ["b", "m12", 0],
  ["c", "m21", 0],
  ["d", "m22", 1],
  ["e", "m41", 0],
  ["f", "m42", 0]
];

// Properties that are required to be zero for a valid 2D Matrix
const matrix2dZeroProps = [
  "m13", "m14", "m23", "m24",
  "m31", "m32", "m34", "m43"
];

// Properties that are required to be one for a valid 2D matrix
const matrix2dOneProps = ["m33", "m44"];


function hasProp(o, prop) {
  return Object.prototype.hasOwnProperty.call(o, prop);
}

function propertyIsTrue(o, prop) {
  return hasProp(o, prop) && Boolean(o[prop]);
}

function sameValueZero(a, b){
  return (isNaN(a) && isNaN(b)) ||
    a === b;
}

// If both alias and actual properties are present, they must be equal.
function validateAliasedProps(init) {
  aliasedProperties.forEach(([alias, prop]) => {
    if (
      hasProp(init, alias) &&
      hasProp(init, prop) &&
      !sameValueZero(init[alias], init[prop])
    ) {
      throw new TypeError(`Invalid Matrix initialization object.`);
    }
  });
}

function isValid2dMatrix(init) {
  return !(matrix2dZeroProps.some(x => hasProp(init, x) && init[x] !== 0) ||
    matrix2dOneProps.some(x => hasProp(init, x) && init[x] !== 1));
}

function getDOMMatrixDimension(init) {
  if (hasProp(init, "is2D") && !init.is2D) {
    return false;
  }

  const valid2DMatrix = isValid2dMatrix(init);

  if (propertyIsTrue(init, "is2D") && !valid2DMatrix) {
    throw new TypeError(`Two Dimensional Matrix Initialization is in an invalid state.`);
  }

  return valid2DMatrix;
}

function fixupDOMMatrixInit(init) {
  const fixedInit = Object.assign({}, init);

  aliasedProperties.forEach(([alias, property, defaultValue]) => {
    if(!hasProp(init, property)){
      fixedInit[property] = hasProp(init, alias) ? init[alias] : defaultValue;
    }
  });


  return fixedInit;
}

// https://drafts.fxtf.org/geometry/#matrix-validate-and-fixup.
exports.validateAndFixupDOMMatrixInit = function (init) {
  validateAliasedProps(init);
  init = fixupDOMMatrixInit(init);
  init.is2D = getDOMMatrixDimension(init);

  return init;
};

exports.arrayFromDOMMatrixInit = function (init) {
  if (init.is2D) {
    return matrix2dArrayProperties.map(x => init[x]);
  }

  return matrix3dArrayProperties.map(x => init[x]);
};

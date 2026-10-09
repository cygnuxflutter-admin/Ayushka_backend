const express = require('express');
const Type = require('../../models/Type');
const checkPermission = require('../../middlewares/checkPermission');
const createCatalogController = require('../../controllers/catalog.controller');
const AppError = require('../../utils/AppError');

/**
 * Normalizes and extracts tag / gender / isFemale / isMale attributes.
 *
 * Supported inputs in body:
 * - tag: 'isFemale' | 'isMale' | 'both' (case-insensitive)
 * - gender: 'female' | 'male' | 'both' (case-insensitive)
 * - isFemale: boolean / string ('true' | 'false')
 * - isMale: boolean / string ('true' | 'false')
 */
const parseTagAndGender = (body, existing = null, isUpdate = false) => {
  let isFemale;
  let isMale;
  let tag;

  const rawTag = (body.tag || body.gender)?.toString().trim().toLowerCase();

  if (rawTag) {
    if (rawTag === 'isfemale' || rawTag === 'female') {
      isFemale = true;
      isMale = false;
      tag = 'isFemale';
    } else if (rawTag === 'ismale' || rawTag === 'male') {
      isFemale = false;
      isMale = true;
      tag = 'isMale';
    } else if (rawTag === 'both' || rawTag === 'all') {
      isFemale = true;
      isMale = true;
      tag = 'both';
    } else {
      throw new AppError("Invalid tag or gender. Allowed values: 'isFemale', 'isMale', 'both'", 400);
    }
  }

  const hasIsFemale = typeof body.isFemale !== 'undefined' && body.isFemale !== null && body.isFemale !== '';
  const hasIsMale = typeof body.isMale !== 'undefined' && body.isMale !== null && body.isMale !== '';

  if (hasIsFemale || hasIsMale) {
    const parseBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

    if (hasIsFemale && hasIsMale) {
      isFemale = parseBool(body.isFemale);
      isMale = parseBool(body.isMale);
    } else if (hasIsFemale && !hasIsMale) {
      isFemale = parseBool(body.isFemale);
      if (isUpdate && existing) {
        isMale = existing.isMale;
      } else {
        isMale = !isFemale;
      }
    } else if (hasIsMale && !hasIsFemale) {
      isMale = parseBool(body.isMale);
      if (isUpdate && existing) {
        isFemale = existing.isFemale;
      } else {
        isFemale = !isMale;
      }
    }

    if (isFemale && isMale) {
      tag = 'both';
    } else if (isFemale) {
      tag = 'isFemale';
    } else if (isMale) {
      tag = 'isMale';
    } else {
      throw new AppError('A type must apply to at least Male, Female, or Both', 400);
    }
  }

  // When creating a new type without tag/gender specified, default to both
  if (!isUpdate && typeof isFemale === 'undefined' && typeof isMale === 'undefined' && !tag) {
    isFemale = true;
    isMale = true;
    tag = 'both';
  }

  return { isFemale, isMale, tag };
};

/**
 * Builds MongoDB query for gender / tag filtering.
 *
 * Twist logic:
 * - Types marked for 'both' (isFemale: true AND isMale: true) show in BOTH female and male queries.
 * - Legacy types (where isFemale/isMale are not set) are treated as applicable to both.
 */
const buildTypeFilterQuery = (req, query) => {
  const { gender, tag, isFemale, isMale, search } = req.query;

  // Search by typeName if provided
  if (search && typeof search === 'string' && search.trim()) {
    query.typeName = new RegExp(search.trim(), 'i');
  }

  const rawGender = typeof gender === 'string' ? gender.trim().toLowerCase() : '';
  const rawTag = typeof tag === 'string' ? tag.trim().toLowerCase() : '';

  const parseBool = (v) => {
    if (v === 'true' || v === true || v === '1' || v === 1) return true;
    if (v === 'false' || v === false || v === '0' || v === 0) return false;
    return undefined;
  };

  const femaleBool = parseBool(isFemale);
  const maleBool = parseBool(isMale);

  // 1. Explicit both: filter only types applicable to both
  if (rawGender === 'both' || rawTag === 'both' || (femaleBool === true && maleBool === true)) {
    query.isFemale = { $ne: false };
    query.isMale = { $ne: false };
    return;
  }

  // 2. Explicit all: return all types
  if (rawGender === 'all' || rawTag === 'all') {
    return;
  }

  // 3. Female filter:
  // Show female-specific types + types applicable to both (isFemale: true)
  const isFemaleFilter =
    rawGender === 'female' ||
    rawTag === 'isfemale' ||
    rawTag === 'female' ||
    femaleBool === true ||
    (typeof femaleBool === 'undefined' && maleBool === false);

  // 4. Male filter:
  // Show male-specific types + types applicable to both (isMale: true)
  const isMaleFilter =
    rawGender === 'male' ||
    rawTag === 'ismale' ||
    rawTag === 'male' ||
    maleBool === true ||
    (typeof maleBool === 'undefined' && femaleBool === false);

  if (isFemaleFilter && !isMaleFilter) {
    query.isFemale = { $ne: false };
  } else if (isMaleFilter && !isFemaleFilter) {
    query.isMale = { $ne: false };
  }
};

const router = express.Router();
const controller = createCatalogController(
  Type,
  ['gaushalaId', 'typeName'],
  null,
  'Type',
  {
    requireGaushala: true,
    filterQuery: (req, query) => {
      buildTypeFilterQuery(req, query);
    },
    transformValues: async (body, req, values, meta = {}) => {
      let existing = null;
      if (meta.isUpdate && meta.id) {
        existing = await Type.findById(meta.id);
      }
      const parsed = parseTagAndGender(body, existing, Boolean(meta.isUpdate));
      if (typeof parsed.isFemale !== 'undefined') values.isFemale = parsed.isFemale;
      if (typeof parsed.isMale !== 'undefined') values.isMale = parsed.isMale;
      if (typeof parsed.tag !== 'undefined') values.tag = parsed.tag;
    },
  },
);

router.get('/', checkPermission('TYPE', 'TYPE_LIST', 'view'), controller.list);
router.post('/', checkPermission('TYPE', 'TYPE_LIST', 'add'), controller.create);
router.get('/:id', checkPermission('TYPE', 'TYPE_LIST', 'view'), controller.get);
router.post('/:id/update', checkPermission('TYPE', 'TYPE_LIST', 'edit'), controller.update);
router.post('/:id/delete', checkPermission('TYPE', 'TYPE_LIST', 'delete'), controller.remove);

module.exports = router;
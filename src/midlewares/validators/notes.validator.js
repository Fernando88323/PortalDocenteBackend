const { celebrate, Joi } = require("celebrate");

// Helper para aceptar número o string que represente número
const numString = Joi.alternatives().try(
  Joi.number().min(0).max(10).precision(2),
  Joi.string()
    .pattern(/^\d+(\.\d{1,2})?$/)
    .custom((value, helpers) => {
      const num = parseFloat(value);
      if (num < 0 || num > 10) {
        return helpers.error("number.outOfRange");
      }
      return num;
    }, "String to number validation")
);

const noteSchema = Joi.object({
  IDInscripcion: Joi.number().required(),
  IDGrupo: Joi.string().optional(), // <-- aquí permitimos IDGrupo sin validar más
  p1: numString,
  pp1: numString,
  vp1: numString,
  p2: numString,
  pp2: numString,
  vp2: numString,
  pl1: numString,
  vl1: numString,
  pl2: numString,
  vl2: numString,
  pl3: numString,
  vl3: numString,
  p3: numString,
  pp3: numString,
  er: numString,
  np: numString,
  NF: numString,
  NMA: numString,
})
  .unknown(false)
  // No acepta otros campos (como IDGrupo)
  .min(1);

const bulkSchema = Joi.array().items(noteSchema).min(1).required();

module.exports = {
  validateBulkNotes: celebrate({ body: bulkSchema }),
};

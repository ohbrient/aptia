const jwt = require('jsonwebtoken');

const LICENSE_SECRET = process.env.LICENSE_SECRET || process.env.JWT_SECRET || 'aptia_license_secret_2025';

/**
 * Genera un JWT firmado con los datos de la licencia
 * NO incluye expiración para que el archivo sea válido indefinidamente
 */
function generateLicenseFile(licenseData) {
  // Crear el payload sin expiración
  const payload = {
    licenseId: licenseData.licenseId,
    empresaId: licenseData.empresaId,
    empresaNombre: licenseData.empresaNombre,
    startDate: licenseData.startDate,
    expiryDate: licenseData.expiryDate,
    maxUsers: licenseData.maxUsers || 50,
    maxCandidates: licenseData.maxCandidates,
    features: licenseData.features || ['pruebas', 'reportes', 'analytics'],
    generatedAt: new Date().toISOString(),
  };

  // Firmar SIN expiración (noExpiresIn)
  const token = jwt.sign(payload, LICENSE_SECRET);

  return {
    token,
    payload,
    filename: `aptia-license-${licenseData.licenseId.substring(0, 8)}.json`,
  };
}

/**
 * Valida el token JWT ignorando expiración
 * Retorna { valid: true, data: {...} } o { valid: false, error: "mensaje" }
 */
function validateLicenseToken(token) {
  try {
    // Decodificar ignorando la expiración
    const decoded = jwt.verify(token, LICENSE_SECRET, { ignoreExpiration: true });
    
    // Validar que tenga los campos requeridos
    if (!decoded.licenseId || !decoded.empresaId || !decoded.maxCandidates) {
      return {
        valid: false,
        error: 'Token incompleto: faltan campos requeridos',
      };
    }

    return {
      valid: true,
      data: decoded,
    };
  } catch (err) {
    return {
      valid: false,
      error: `Error validando token: ${err.message}`,
    };
  }
}

/**
 * Crea el contenido del archivo JSON que descargará el usuario
 * Estructura: { version, type, license, signature }
 */
function createLicenseFileContent(licenseFile) {
  const fileObject = {
    version: '1.0',
    type: 'aptia_license_key',
    license: licenseFile.payload,
    signature: licenseFile.token,
  };

  return JSON.stringify(fileObject, null, 2);
}

/**
 * Parsea el contenido del archivo JSON cargado
 * Retorna { token, license } o lanza error
 */
function parseLicenseFile(fileContent) {
  try {
    // Parsear JSON
    const parsed = JSON.parse(fileContent);

    // Validar estructura
    if (parsed.version !== '1.0') {
      throw new Error('Versión del archivo no soportada');
    }

    if (parsed.type !== 'aptia_license_key') {
      throw new Error('Tipo de archivo incorrecto: no es una licencia Aptia válida');
    }

    if (!parsed.signature || !parsed.license) {
      throw new Error('Archivo corrupto: faltan signature o license');
    }

    return {
      signature: parsed.signature,
      license: parsed.license,
    };
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Archivo JSON inválido');
    }
    throw err;
  }
}

module.exports = {
  generateLicenseFile,
  validateLicenseToken,
  createLicenseFileContent,
  parseLicenseFile,
};
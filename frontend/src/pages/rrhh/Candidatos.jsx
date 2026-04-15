import Candidatos from '../empresa/Candidatos';

export default function CandidatosRRHH() {
  return <Candidatos endpoint="/rrhh/candidatos-todos" showEmpresa={true} />;
}

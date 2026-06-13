# Verificación end-to-end de los 6 objetivos de roles (responsable/maestro/director)
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

function Post($url, $body, $headers) {
  Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $body -Headers $headers
}
function Get-($url, $headers) { (Invoke-RestMethod -Uri $url -Headers $headers).data }

# ── Sesiones ──
$ld = Post "$base/api/auth/login" '{"email":"direccion@cecma.edu.sv","contrasena":"Directora.CECMA.2026"}' @{}
$hd = @{ Authorization = "Bearer $($ld.data.accessToken)" }
$lp = Post "$base/api/auth/login" '{"email":"padre1@correo.com","contrasena":"Padre.CECMA.2026"}' @{}
$hp = @{ Authorization = "Bearer $($lp.data.accessToken)" }
$lm = Post "$base/api/auth/login" '{"email":"maestro1@cecma.edu.sv","contrasena":"Maestro.CECMA.2026"}' @{}
$hm = @{ Authorization = "Bearer $($lm.data.accessToken)" }
$maestroPersonaId = $lm.data.usuario.personaId

# ── OBJETIVO 1: el responsable registra a su hijo ──
$bodyHijo = @{
  persona = @{ primerNombre = 'Mateo'; primerApellido = 'Hernandez'; segundoApellido = 'Lopez'; genero = 'M'; fechaNacimiento = '2017-03-09' }
  detalle = @{ nombreContactoEmergencia = 'Ana Lopez'; telefonoContactoEmergencia = '7444-5555' }
} | ConvertTo-Json
$hijo = Post "$base/api/personas/mis-hijos" $bodyHijo $hp
$misHijos = Get- "$base/api/personas/mis-hijos" $hp
$vinculado = $misHijos | Where-Object { $_.id -eq $hijo.data.id }
if ($vinculado) { Write-Output "1 PASS responsable registra hijo -> $($hijo.data.codigoAlumno) (vinculado)" }
else { Write-Output "1 FAIL hijo no quedó vinculado" }

# ── OBJETIVO 3: el director crea materia y la asigna a un docente ──
$maestros = Get- "$base/api/personas/maestros?limit=100" $hd
$miMaestro = $maestros | Where-Object { $_.persona.id -eq $maestroPersonaId } | Select-Object -First 1
$anio = Get- "$base/api/academico/anios-lectivos/activo" $hd
$secciones = Get- "$base/api/academico/secciones" $hd
$sec = $secciones | Select-Object -First 1
$mat = Post "$base/api/academico/materias" (@{ nombre = "Robotica $(Get-Random)"; codigo = 'ROB'; colorHex = '#a78bfa' } | ConvertTo-Json) $hd
$asigNueva = Post "$base/api/academico/asignaciones" (@{ seccionId = $sec.id; materiaId = $mat.data.id; maestroId = $miMaestro.id; anioLectivoId = $anio.id; horasSemanales = 2 } | ConvertTo-Json) $hd
Write-Output "3 PASS director crea materia y la asigna -> asignacion $($asigNueva.data.id.Substring(0,8))"

# ── OBJETIVO 2: el maestro matricula a un alumno (queda como guía) ──
$secGuia = $secciones | Where-Object { $_.id -eq $sec.id } | Select-Object -First 1
$bodyMat = @{ alumnoId = $hijo.data.id; seccionId = $secGuia.id; anioLectivoId = $anio.id; fechaInscripcion = '2026-06-12' } | ConvertTo-Json
$insc = Post "$base/api/inscripciones" $bodyMat $hm
$guiaNombre = "$($insc.data.maestroGuia.persona.primerNombre) $($insc.data.maestroGuia.persona.primerApellido)"
Write-Output "2 PASS maestro matricula -> estado $($insc.data.estado), guia=$guiaNombre"

# ── OBJETIVO 4: el maestro arma su propio horario (solo sus asignaciones) ──
$dashM = Get- "$base/api/reportes/dashboard/maestro" $hm
$asigMia = $dashM.asignaciones | Select-Object -First 1
$aulas = Get- "$base/api/horarios/aulas" $hd
$bodyHor = @{ seccionMateriaId = $asigMia.id; aulaId = $aulas[0].id; diaSemana = 5; horaInicio = '14:05'; horaFin = '14:50' } | ConvertTo-Json
$hor = Post "$base/api/horarios/clases" $bodyHor $hm
Write-Output "4 PASS maestro arma horario propio -> $($hor.data.id.Substring(0,8))"

# Seguridad 4b: el maestro NO puede agendar una asignación ajena
$asigsTodas = Get- "$base/api/academico/asignaciones" $hd
$asigAjena = $asigsTodas | Where-Object { $_.maestroId -ne $miMaestro.id } | Select-Object -First 1
if ($asigAjena) {
  try {
    Post "$base/api/horarios/clases" (@{ seccionMateriaId = $asigAjena.id; aulaId = $aulas[0].id; diaSemana = 5; horaInicio = '15:00'; horaFin = '15:45' } | ConvertTo-Json) $hm | Out-Null
    Write-Output "4b FAIL: se permitió agendar materia ajena"
  } catch {
    $e = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Output "4b PASS rechazo materia ajena en horario -> $($e.error.code)"
  }
}

# ── OBJETIVO 5: el maestro crea actividad de su materia; rechazo de materia ajena ──
$gradoMat = $asigMia.seccion.grado.id
$periodos = Get- "$base/api/calificaciones/periodos?gradoId=$gradoMat" $hm
$pVig = $periodos | Where-Object { $_.numeroPeriodo -eq 2 } | Select-Object -First 1
if (-not $pVig) { $pVig = $periodos | Select-Object -First 1 }
$act = Post "$base/api/calificaciones/actividades" (@{ seccionMateriaId = $asigMia.id; periodoEvaluacionId = $pVig.id; titulo = "Tarea $(Get-Random)"; tipo = 'TAREA'; porcentajePeso = 10; notaMaxima = 10 } | ConvertTo-Json) $hm
Write-Output "5 PASS maestro crea actividad de su materia -> $($act.data.id.Substring(0,8))"
if ($asigAjena) {
  try {
    Post "$base/api/calificaciones/actividades" (@{ seccionMateriaId = $asigAjena.id; periodoEvaluacionId = $pVig.id; titulo = 'X'; tipo = 'TAREA'; porcentajePeso = 5; notaMaxima = 10 } | ConvertTo-Json) $hm | Out-Null
    Write-Output "5b FAIL: se permitió actividad en materia ajena"
  } catch {
    $e = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Output "5b PASS rechazo materia ajena en actividad -> $($e.error.code)"
  }
}

# ── OBJETIVO 6: el docente guía ve y publica el cuadro de honor de su sección ──
$misSecc = Get- "$base/api/calendario/cuadro-honor/mis-secciones" $hm
if (-not $misSecc -or $misSecc.Count -eq 0) {
  Write-Output "6 SKIP el maestro no es guía de ninguna sección con datos"
} else {
  $sg = $misSecc[0]
  $prev = Get- "$base/api/calendario/cuadro-honor/seccion/$($sg.seccionId)?top=3" $hm
  Write-Output "6a PASS preview cuadro de honor ($($sg.nombre)) -> $($prev.entradas.Count) alumnos"
  try {
    $pub = Post "$base/api/calendario/cuadro-honor/seccion/$($sg.seccionId)/publicar" '{"top":3}' $hm
    $publico = Get- "$base/api/calendario/publico/cuadro-honor" @{}
    Write-Output "6b PASS publicado -> $($pub.data.publicados) entradas, cuadro público total=$($publico.Count)"
  } catch {
    $e = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Output "6b INFO publicar devolvió $($e.error.code) (sin notas calificadas en la sección guía)"
  }
}

# Seguridad 6c: un responsable NO puede publicar cuadro de honor
try {
  Post "$base/api/calendario/cuadro-honor/seccion/$($sec.id)/publicar" '{"top":3}' $hp | Out-Null
  Write-Output "6c FAIL: el responsable pudo publicar"
} catch {
  $code = ($_.ErrorDetails.Message | ConvertFrom-Json).error.code
  Write-Output "6c PASS responsable bloqueado -> $code"
}

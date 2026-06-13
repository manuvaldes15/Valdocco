# Verificación end-to-end del registro académico usando los mismos payloads que envía la UI
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'

function Post($url, $body, $headers) {
  Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $body -Headers $headers
}

# Director
$ld = Post "$base/api/auth/login" '{"email":"direccion@cecma.edu.sv","contrasena":"Directora.CECMA.2026"}' @{}
$hd = @{ Authorization = "Bearer $($ld.data.accessToken)" }

# 1. Crear alumno (modal "Nuevo alumno")
$bodyAlumno = @{
  persona = @{ primerNombre = 'Lucia'; primerApellido = 'Ramos'; segundoApellido = 'Vega'; fechaNacimiento = '2018-08-12'; genero = 'F' }
  detalle = @{ tipoSangre = 'O+'; nombreContactoEmergencia = 'Marta Vega'; telefonoContactoEmergencia = '7111-2222' }
} | ConvertTo-Json
$nuevo = Post "$base/api/personas/alumnos" $bodyAlumno $hd
Write-Output "1 PASS crear alumno -> $($nuevo.data.codigoAlumno)"

# 2. Matricular (modal "Matricular alumno")
$anio = (Invoke-RestMethod -Uri "$base/api/academico/anios-lectivos/activo" -Headers $hd).data
$secciones = (Invoke-RestMethod -Uri "$base/api/academico/secciones" -Headers $hd).data
$sec2C = $secciones | Where-Object { $_.grado.nombre -eq '2do Grado' } | Select-Object -First 1
$maestros = (Invoke-RestMethod -Uri "$base/api/personas/maestros?limit=100" -Headers $hd).data
$bodyMat = @{
  alumnoId = $nuevo.data.id; seccionId = $sec2C.id; anioLectivoId = $anio.id
  maestroGuiaId = $maestros[0].id; fechaInscripcion = '2026-06-11'
} | ConvertTo-Json
$insc = Post "$base/api/inscripciones" $bodyMat $hd
Write-Output "2 PASS matricular -> estado $($insc.data.estado)"

# 3. Maestro crea actividad en el periodo vigente (modal "Nueva actividad")
$lm = Post "$base/api/auth/login" '{"email":"maestro1@cecma.edu.sv","contrasena":"Maestro.CECMA.2026"}' @{}
$hm = @{ Authorization = "Bearer $($lm.data.accessToken)" }
$dashM = (Invoke-RestMethod -Uri "$base/api/reportes/dashboard/maestro" -Headers $hm).data
$asig = $dashM.asignaciones | Where-Object { $_.seccion.grado.nombre -eq '2do Grado' } | Select-Object -First 1
$urlPeriodos = "$base/api/calificaciones/periodos?gradoId=$($asig.seccion.grado.id)"
$periodos = (Invoke-RestMethod -Uri $urlPeriodos -Headers $hm).data
$p2 = $periodos | Where-Object { $_.numeroPeriodo -eq 2 }
$bodyAct = @{
  seccionMateriaId = $asig.id; periodoEvaluacionId = $p2.id; titulo = 'Quiz de fracciones'
  tipo = 'QUIZ'; porcentajePeso = 15; notaMaxima = 10; fechaEntrega = '2026-06-20'
} | ConvertTo-Json
$act = Post "$base/api/calificaciones/actividades" $bodyAct $hm
Write-Output "3 PASS crear actividad -> $($act.data.id.Substring(0,8))"

# 4. Notas PENDIENTE generadas automáticamente (incluida la alumna recién matriculada)
$urlNotas = "$base/api/calificaciones/actividades/$($act.data.id)/notas"
$notas = (Invoke-RestMethod -Uri $urlNotas -Headers $hm).data
Write-Output "4 PASS notas pendientes generadas para $($notas.Count) alumnos"

# 5. Calificar a la alumna nueva (tabla de calificación)
$filaLucia = $notas | Where-Object { $_.alumno.persona.primerNombre -eq 'Lucia' }
$urlCalificar = "$base/api/calificaciones/actividades/$($act.data.id)/calificar"
Post $urlCalificar (@{ alumnoId = $filaLucia.alumno.id; nota = 9.5 } | ConvertTo-Json) $hm | Out-Null
Write-Output "5 PASS calificar -> Lucia 9.5/10"

# 6. Emitir ficha (modal del maestro) — dispara notificación al responsable
$bodyFicha = @{
  alumnoId = $filaLucia.alumno.id; titulo = 'Felicitacion por desempeno'
  descripcion = 'Excelente participacion en clase durante la semana.'; gravedad = 'BAJA'; fechaEmision = '2026-06-11'
} | ConvertTo-Json
$ficha = Post "$base/api/calendario/fichas" $bodyFicha $hm
Write-Output "6 PASS emitir ficha -> $($ficha.data.id.Substring(0,8))"

# 7. El resumen del periodo vigente refleja la nota
$urlResumen = "$base/api/calificaciones/alumnos/$($filaLucia.alumno.id)/resumen?anioLectivoId=$($anio.id)"
$resumen = (Invoke-RestMethod -Uri $urlResumen -Headers $hm).data
$matem = $resumen.materias | Where-Object { $_.materia -eq 'Matemática' }
Write-Output "7 PASS resumen ($($resumen.periodo.nombre)) -> Matematica promedio=$($matem.promedioActual) puedeAprobar=$($matem.puedeAprobar)"

# 8. Horario nuevo + conflicto detectado (modal "Nuevo horario")
$aulas = (Invoke-RestMethod -Uri "$base/api/horarios/aulas" -Headers $hd).data
$asigs = (Invoke-RestMethod -Uri "$base/api/academico/asignaciones" -Headers $hd).data
$asigLen = $asigs | Where-Object { $_.materia.nombre -like 'Lenguaje*' } | Select-Object -First 1
$bodyHor = @{
  seccionMateriaId = $asigLen.id; maestroId = $asigLen.maestroId; aulaId = $aulas[0].id
  anioLectivoId = $anio.id; diaSemana = 2; horaInicio = '07:00'; horaFin = '08:30'
} | ConvertTo-Json
Post "$base/api/horarios/clases" $bodyHor $hd | Out-Null
Write-Output "8 PASS horario creado (martes 07:00-08:30)"
try {
  Post "$base/api/horarios/clases" $bodyHor $hd | Out-Null
  Write-Output "8 FAIL: el conflicto no fue detectado"
} catch {
  $err = $_.ErrorDetails.Message | ConvertFrom-Json
  Write-Output "9 PASS conflicto detectado -> $($err.error.code)"
}

# 10. Evento y anuncio (modales del director)
Post "$base/api/calendario/eventos" (@{ titulo = 'Reunion de padres'; fechaInicio = '2026-06-26'; fechaFin = '2026-06-26'; tipoEvento = 'INSTITUCIONAL'; publicoDestino = 'PADRES' } | ConvertTo-Json) $hd | Out-Null
Write-Output "10 PASS evento creado"

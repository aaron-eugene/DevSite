$root = Get-Location

Get-ChildItem -Recurse -File |
Where-Object {
	$_.FullName -notmatch '\\node_modules\\' -and
	$_.FullName -notmatch '\\.git\\' -and
	$_.FullName -notmatch '\\dist\\' -and
	$_.FullName -notmatch '\\.astro\\'
} |
ForEach-Object {
	$_.FullName.Replace($root.Path + '\', '')
}
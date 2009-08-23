for %%X in (*.processing) do (
echo %%~nX > generate-name.html
copy /b generate-1.html+generate-name.html+generate-2.html+"%%X"+generate-3.html "../%%~nX.html"
)
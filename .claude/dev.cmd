@echo off
rem Node is not on this machine's system PATH; prepend it so npm and its
rem child node processes resolve, then hand off to the normal dev script.
set "PATH=C:\Program Files\nodejs;%PATH%"
npm run dev

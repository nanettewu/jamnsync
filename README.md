# JamNSync: User-Friendly Virtual Rehearsal Platform

This project is a web-based system that streamlines the virtual music-making experience for small music groups (i.e. 2 to 5 people). Existing software used for network music performance (NMP) are mostly partial solutions: generic video conferencing systems are simple, but not optimized for simultaneous music rehearsals, while real-time low latency applications are functional but complicated and troublesome. Online DAWs and offline home-spun solutions begin to solve this problem, but do not provide a clear means of real-time communication among group members.

The proposed system is an accessible, complete solution that encapsulates the important aspects of an in-person rehearsal. By abstracting away underlying complexities of the system (e.g. audio mixing), JamNSync enables musicians to set up a recording session to rehearse in real-time without extensive technical understanding.

---

## Subprojects

### Client (JS)

Hosts in-browser React app.

### Server (Python)

Flask backend that communicates with Postgres DB.

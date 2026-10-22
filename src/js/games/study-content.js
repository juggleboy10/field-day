  // ================================================================ STUDY HALL: content for the CompTIA A+ games
  // Written to the A+ V15 exam objectives: Core 1 (220-1201) and Core 2 (220-1202). Each question:
  // [domain, question, [four answers], index of the right one, why]. Answers are shuffled when shown.
  const APLUS = (() => {
    const DOMAINS = {
      c1m: { exam: 'Core 1', name: 'Mobile devices', w: 13 },
      c1n: { exam: 'Core 1', name: 'Networking', w: 23 },
      c1h: { exam: 'Core 1', name: 'Hardware', w: 25 },
      c1v: { exam: 'Core 1', name: 'Virtualization and cloud', w: 11 },
      c1t: { exam: 'Core 1', name: 'Hardware and network troubleshooting', w: 28 },
      c2o: { exam: 'Core 2', name: 'Operating systems', w: 28 },
      c2s: { exam: 'Core 2', name: 'Security', w: 28 },
      c2t: { exam: 'Core 2', name: 'Software troubleshooting', w: 23 },
      c2p: { exam: 'Core 2', name: 'Operational procedures', w: 21 },
    };
    const Q = [
      // ---------------- Core 1: mobile devices
      ['c1m', 'Which technology lets you pay by tapping your phone on a card reader?', ['NFC', 'Bluetooth', 'Infrared', 'GPS'], 0, 'Near Field Communication works over a few centimetres, which suits tap-to-pay.'],
      ['c1m', 'Which wireless technology usually pairs a phone with a wireless headset?', ['Bluetooth', 'NFC', 'Cellular', 'GPS'], 0, 'Bluetooth is the short-range standard for headsets, keyboards and speakers.'],
      ['c1m', 'What memory form factor do most laptops use?', ['SO-DIMM', 'DIMM', 'SIMM', 'CompactFlash'], 0, 'SO-DIMMs (small outline DIMMs) are the smaller modules made for laptops.'],
      ['c1m', 'A laptop screen is very dim, but you can just see the picture with a flashlight. What has most likely failed?', ['The backlight', 'The digitizer', 'The video card driver', 'The Wi-Fi antenna'], 0, 'The picture is there but not lit: the backlight (or its inverter on older screens) has failed.'],
      ['c1m', 'What is the digitizer on a phone or tablet?', ['The layer that turns touches into input', 'The chip that stores photos', 'The camera sensor', 'The cellular modem'], 0, 'The digitizer senses touch and converts it to digital input.'],
      ['c1m', 'Sharing your phone’s cellular data connection with a laptop is called:', ['Tethering (a hotspot)', 'Roaming', 'Port forwarding', 'Pairing'], 0, 'Tethering or a mobile hotspot shares the phone’s data connection.'],
      ['c1m', 'What does MDM software do for a company?', ['Centrally manages and secures employees’ mobile devices', 'Speeds up the cellular network', 'Backs up the company website', 'Charges devices wirelessly'], 0, 'Mobile device management enforces policies, pushes apps and can wipe lost devices.'],
      ['c1m', 'A phone’s back cover is bulging and the phone runs hot. What should you do?', ['Stop using it and have the swollen battery replaced', 'Press the cover back down', 'Charge it overnight', 'Update the apps'], 0, 'A swollen lithium-ion battery is a fire hazard: power down, replace it, dispose of it properly.'],
      ['c1m', 'In most laptops, where do the Wi-Fi antenna wires run?', ['Around the display, in the lid', 'Under the keyboard', 'Inside the battery', 'Along the hinge only'], 0, 'The antennas sit in the display bezel, high up, for better reception.'],
      ['c1m', 'What does a docking station let a laptop do?', ['Connect to many peripherals through one connection', 'Charge without a battery', 'Run two operating systems', 'Use a faster CPU'], 0, 'Docks and port replicators connect monitors, keyboards, network and more in one go.'],
      ['c1m', 'Which connector do recent Android phones and iPhone 15 and later use to charge?', ['USB-C', 'Micro-USB', 'Lightning', 'Mini-USB'], 0, 'USB-C is reversible and now standard on phones, including iPhone 15 and later.'],
      ['c1m', 'An employee’s company phone is lost. What should IT do first through MDM?', ['Lock it and remotely wipe it', 'Buy a new phone', 'Change the Wi-Fi password', 'Disable Bluetooth'], 0, 'A remote lock and wipe protects company data on a lost device.'],
      // ---------------- Core 1: networking
      ['c1n', 'Which port does HTTPS use by default?', ['443', '80', '22', '3389'], 0, 'HTTPS is TCP 443; plain HTTP is 80.'],
      ['c1n', 'Which port does SSH use?', ['22', '23', '21', '25'], 0, 'SSH (secure remote shell) is TCP 22. Telnet, unencrypted, is 23.'],
      ['c1n', 'Which port does Remote Desktop Protocol (RDP) use?', ['3389', '443', '445', '139'], 0, 'RDP listens on TCP 3389.'],
      ['c1n', 'Which port does DNS use?', ['53', '67', '110', '161'], 0, 'DNS uses port 53 (UDP for most lookups, TCP too).'],
      ['c1n', 'What does a DHCP server do?', ['Hands out IP addresses and settings automatically', 'Turns names into IP addresses', 'Encrypts Wi-Fi traffic', 'Blocks unwanted traffic'], 0, 'DHCP assigns IP address, subnet mask, gateway and DNS servers.'],
      ['c1n', 'A PC has the address 169.254.33.7. What does that tell you?', ['It couldn’t reach a DHCP server (APIPA)', 'It has a static address', 'It’s on the internet', 'It’s using IPv6'], 0, '169.254.x.x is APIPA: Windows gave itself a link-local address because DHCP didn’t answer.'],
      ['c1n', 'Which of these is a private IPv4 address?', ['192.168.1.10', '8.8.8.8', '172.32.5.1', '100.1.1.1'], 0, 'Private ranges are 10.x.x.x, 172.16-31.x.x and 192.168.x.x.'],
      ['c1n', 'Which 802.11 standard is Wi-Fi 6?', ['802.11ax', '802.11ac', '802.11n', '802.11g'], 0, 'Wi-Fi 6 is 802.11ax; Wi-Fi 5 is 802.11ac; Wi-Fi 4 is 802.11n.'],
      ['c1n', 'On 2.4 GHz Wi-Fi in North America, which channels don’t overlap?', ['1, 6 and 11', '1, 2 and 3', '2, 7 and 12', '36, 40 and 44'], 0, 'Channels 1, 6 and 11 are spaced far enough apart not to overlap.'],
      ['c1n', 'Which device forwards frames inside a LAN using MAC addresses?', ['A switch', 'A router', 'A modem', 'A firewall'], 0, 'Switches work at layer 2 with MAC addresses; routers route between networks by IP address.'],
      ['c1n', 'Which DNS record maps a host name to an IPv4 address?', ['A', 'AAAA', 'MX', 'CNAME'], 0, 'A records are IPv4, AAAA records IPv6, MX records point to mail servers.'],
      ['c1n', 'How long is an IPv6 address?', ['128 bits', '32 bits', '64 bits', '48 bits'], 0, 'IPv6 addresses are 128 bits; IPv4 addresses are 32.'],
      ['c1n', 'Which Wi-Fi security option is the strongest?', ['WPA3', 'WPA2-TKIP', 'WEP', 'WPA'], 0, 'WPA3 is the newest and strongest; WEP is broken.'],
      ['c1n', 'Which feature on a home router sends incoming traffic on a port to a PC inside the network?', ['Port forwarding', 'Content filtering', 'MAC filtering', 'DHCP reservation'], 0, 'Port forwarding maps a public port to an internal address and port.'],
      ['c1n', 'What does PoE provide?', ['Power and data over one Ethernet cable', 'Faster Wi-Fi', 'A backup internet line', 'Encryption on the cable'], 0, 'Power over Ethernet runs devices like access points and cameras from the switch.'],
      ['c1n', 'Which connector goes on coaxial cable for a cable modem?', ['F-type', 'RJ45', 'LC', 'RJ11'], 0, 'Cable TV and cable modems use coax with F-type connectors.'],
      ['c1n', 'Which tool helps you find which wall jack a cable runs to?', ['A toner probe', 'A crimper', 'A loopback plug', 'A punchdown tool'], 0, 'A toner puts a signal on the cable; the probe beeps when it’s near it.'],
      ['c1n', 'What does a VLAN do?', ['Splits one switch into separate logical networks', 'Encrypts a WAN link', 'Speeds up Wi-Fi', 'Gives out IP addresses'], 0, 'VLANs separate traffic into different broadcast domains on the same hardware.'],
      ['c1n', 'Up to what distance can Cat 6 carry 10 Gbps Ethernet?', ['55 metres', '100 metres', '10 metres', '500 metres'], 0, 'Cat 6 does 10GBASE-T to about 55 m; Cat 6a does it to 100 m.'],
      ['c1n', 'Which port does SMTP use to send mail between servers?', ['25', '110', '143', '587'], 0, 'SMTP is port 25 (587 is used for submission from mail clients). POP3 is 110, IMAP 143.'],
      // ---------------- Core 1: hardware
      ['c1h', 'Which RAID level mirrors data across two drives?', ['RAID 1', 'RAID 0', 'RAID 5', 'RAID 10'], 0, 'RAID 1 is mirroring: either drive can fail.'],
      ['c1h', 'Which RAID level stripes data with no redundancy?', ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6'], 0, 'RAID 0 is fast but one failed drive loses everything.'],
      ['c1h', 'What is the minimum number of drives for RAID 5?', ['3', '2', '4', '5'], 0, 'RAID 5 stripes with parity across at least three drives.'],
      ['c1h', 'What is the minimum number of drives for RAID 10?', ['4', '2', '3', '6'], 0, 'RAID 10 is mirrored pairs striped together: four drives at least.'],
      ['c1h', 'An M.2 NVMe SSD talks to the system over:', ['PCIe lanes', 'SATA', 'USB', 'IDE'], 0, 'NVMe uses PCI Express lanes, which is why it’s much faster than SATA.'],
      ['c1h', 'Will a DDR4 module fit in a DDR5 slot?', ['No: the notch is in a different place', 'Yes, it just runs slower', 'Yes, with an adapter in the BIOS', 'Only in laptops'], 0, 'Each DDR generation is keyed differently so the wrong one can’t be inserted.'],
      ['c1h', 'What does ECC memory do?', ['Detects and corrects memory errors', 'Runs at a higher voltage', 'Doubles the capacity', 'Cools the RAM'], 0, 'Error-correcting code RAM is common in servers.'],
      ['c1h', 'In a laser printer, which step melts the toner onto the paper?', ['Fusing', 'Developing', 'Charging', 'Exposing'], 0, 'The fuser’s heat and pressure bond the toner to the paper.'],
      ['c1h', 'Which printer type needs special heat-sensitive paper?', ['Thermal', 'Inkjet', 'Laser', 'Impact'], 0, 'Thermal printers (like receipt printers) darken heat-sensitive paper.'],
      ['c1h', 'Which printer type is used for multipart (carbon copy) forms?', ['Impact (dot matrix)', 'Laser', 'Inkjet', 'Thermal'], 0, 'Impact printers strike through the copies.'],
      ['c1h', 'Which connector powers the motherboard itself?', ['24-pin ATX', 'SATA power', '6-pin PCIe', 'Molex'], 0, 'The main motherboard connector is the 24-pin ATX; the CPU gets a separate 4/8-pin.'],
      ['c1h', 'Which video connector carries an analog signal?', ['VGA', 'HDMI', 'DisplayPort', 'USB-C'], 0, 'VGA is analog; HDMI, DisplayPort and USB-C carry digital video.'],
      ['c1h', 'What is thermal paste for?', ['Filling the tiny gaps between the CPU and its cooler', 'Holding the CPU in the socket', 'Insulating the motherboard', 'Cleaning the CPU pins'], 0, 'It conducts heat across the microscopic air gaps.'],
      ['c1h', 'What is a TPM used for?', ['Storing encryption keys in hardware (e.g. for BitLocker)', 'Speeding up the GPU', 'Cooling the CPU', 'Managing the fans'], 0, 'The Trusted Platform Module secures keys and supports Secure Boot and BitLocker.'],
      ['c1h', 'How fast is SATA III?', ['6 Gbps', '3 Gbps', '1.5 Gbps', '12 Gbps'], 0, 'SATA III runs at 6 Gbps (about 600 MB/s in practice).'],
      ['c1h', 'How fast is USB 3.2 Gen 2?', ['10 Gbps', '5 Gbps', '20 Gbps', '480 Mbps'], 0, 'Gen 1 is 5 Gbps, Gen 2 is 10 Gbps, Gen 2x2 is 20 Gbps; USB 2.0 is 480 Mbps.'],
      ['c1h', 'Where should a graphics card normally go?', ['The PCIe x16 slot', 'A PCIe x1 slot', 'An M.2 slot', 'A RAM slot'], 0, 'GPUs need the bandwidth of the x16 slot.'],
      ['c1h', 'What does Secure Boot do?', ['Lets only trusted, signed boot software run', 'Encrypts the hard drive', 'Sets a BIOS password', 'Boots from the network'], 0, 'Secure Boot, a UEFI feature, blocks unsigned bootloaders such as rootkits.'],
      // ---------------- Core 1: virtualization and cloud
      ['c1v', 'A Type 1 hypervisor runs:', ['Directly on the hardware (bare metal)', 'As an app on Windows or macOS', 'Only in the cloud', 'Inside a web browser'], 0, 'Type 1 (like ESXi or Hyper-V Server) is bare metal; Type 2 runs on a host OS.'],
      ['c1v', 'Webmail like Gmail is an example of which cloud model?', ['SaaS', 'IaaS', 'PaaS', 'On-premises'], 0, 'Software as a Service: you just use the software.'],
      ['c1v', 'Renting virtual servers, storage and networks by the hour is:', ['IaaS', 'SaaS', 'PaaS', 'DaaS'], 0, 'Infrastructure as a Service: you manage the OS and up.'],
      ['c1v', 'A cloud that scales resources up and down automatically with demand has:', ['Rapid elasticity', 'Measured service', 'High availability', 'Shared tenancy'], 0, 'Elasticity grows and shrinks resources as needed.'],
      ['c1v', 'Paying only for the cloud resources you actually use is called:', ['Metered (measured) service', 'Elasticity', 'Multitenancy', 'Redundancy'], 0, 'Measured service bills by usage.'],
      ['c1v', 'A company uses its own private cloud plus a public cloud together. That’s a:', ['Hybrid cloud', 'Community cloud', 'Public cloud', 'Private cloud'], 0, 'Hybrid combines private and public clouds.'],
      ['c1v', 'What must be on in the BIOS/UEFI to run virtual machines well?', ['Hardware virtualization (Intel VT-x / AMD-V)', 'Secure Boot', 'Fast Boot', 'Legacy USB support'], 0, 'Virtualization extensions let the hypervisor run guests efficiently.'],
      ['c1v', 'How do containers differ from virtual machines?', ['Containers share the host’s OS kernel', 'Containers need their own full OS', 'Containers only run in the cloud', 'Containers can’t run apps'], 0, 'Containers are lighter because they share the kernel; VMs each have a full OS.'],
      ['c1v', 'Why test suspicious software in a virtual machine?', ['It’s isolated (a sandbox) from the real system', 'It runs faster', 'It can’t use the network', 'It makes the software legal'], 0, 'A sandboxed VM can be thrown away if the software is harmful.'],
      ['c1v', 'Desktops hosted in a data centre and used remotely are called:', ['VDI', 'IaaS', 'NAS', 'VPN'], 0, 'Virtual desktop infrastructure hosts the desktops centrally.'],
      // ---------------- Core 1: hardware and network troubleshooting
      ['c1t', 'What is the first step of the CompTIA troubleshooting method?', ['Identify the problem', 'Establish a theory of probable cause', 'Test the theory', 'Document findings'], 0, 'Identify, theorize, test, plan and implement, verify, document.'],
      ['c1t', 'What is the last step of the troubleshooting method?', ['Document findings, actions and outcomes', 'Verify full functionality', 'Implement the solution', 'Test the theory'], 0, 'Documenting helps the next person (and you) with the same problem.'],
      ['c1t', 'A user can ping 8.8.8.8 but can’t browse to websites by name. What’s the likely problem?', ['DNS', 'DHCP', 'A bad cable', 'The default gateway'], 0, 'Reaching an IP but not names points to name resolution: DNS.'],
      ['c1t', 'A PC keeps shutting down after a few minutes of heavy use. First thing to check?', ['Overheating: fans, dust, thermal paste', 'The monitor cable', 'The keyboard', 'The DNS settings'], 0, 'Shutdowns under load are a classic sign of overheating.'],
      ['c1t', 'A hard drive is clicking and grinding. What should you do first?', ['Back up the data, then replace the drive', 'Defragment it', 'Reinstall Windows', 'Update the BIOS'], 0, 'Clicking means a failing mechanical drive: save the data while you can.'],
      ['c1t', 'Laser prints are faded all over. The likely cause?', ['Low toner', 'A bad fuser', 'Wrong paper size', 'A network problem'], 0, 'Faint prints usually mean the toner is low.'],
      ['c1t', 'Toner on a laser print smears and rubs off. Which part has likely failed?', ['The fuser', 'The toner cartridge', 'The pickup roller', 'The transfer belt'], 0, 'If the toner isn’t fused it rubs off: replace the fuser.'],
      ['c1t', 'A laser printer prints faint copies of earlier images (ghosting). What’s the likely cause?', ['The imaging drum (or cleaning) is failing', 'Low toner', 'The wrong driver', 'Damp paper'], 0, 'Ghosting comes from the drum not being cleaned or discharged properly.'],
      ['c1t', 'A laptop display flickers when you move the lid. The likely cause?', ['A loose or damaged display cable', 'A bad hard drive', 'Low battery', 'A driver update'], 0, 'Flicker that changes with the lid points to the display cable through the hinge.'],
      ['c1t', 'A PC says "No bootable device" after you added a drive. First thing to check?', ['The boot order in the BIOS/UEFI', 'The monitor', 'The network cable', 'The RAM speed'], 0, 'The new drive may now be first in the boot order.'],
      ['c1t', 'Wi-Fi is slow in an apartment with dozens of nearby networks. Best fix?', ['Change to a less crowded channel (or 5 GHz)', 'Turn off DHCP', 'Use a longer cable', 'Lower the screen brightness'], 0, 'Channel interference is common in crowded areas.'],
      ['c1t', 'A RAID 5 array reports "degraded". What does that mean?', ['A drive has failed; replace it and rebuild', 'It needs defragmenting', 'It’s full', 'It’s been encrypted'], 0, 'RAID 5 survives one failure but must be rebuilt before a second.'],
      ['c1t', 'Which tool tests a network port on a switch or NIC by sending its own signal back?', ['A loopback plug', 'A toner probe', 'A multimeter', 'A crimper'], 0, 'A loopback plug loops transmit to receive for testing.'],
      ['c1t', 'A new PC beeps and won’t show anything on screen at power-on. What’s happening?', ['POST found a hardware problem (beep code)', 'Windows is updating', 'The monitor is in sleep mode', 'DNS failed'], 0, 'Beep codes report POST failures, often RAM or video; check the board’s manual.'],
      // ---------------- Core 2: operating systems
      ['c2o', 'Which Windows command checks a disk for file system errors?', ['chkdsk', 'sfc', 'diskpart', 'format'], 0, 'chkdsk checks (and with /f fixes) the file system.'],
      ['c2o', 'Which Windows command scans and repairs protected system files?', ['sfc /scannow', 'chkdsk /f', 'gpupdate /force', 'ipconfig /renew'], 0, 'System File Checker replaces damaged system files.'],
      ['c2o', 'Which command applies new Group Policy settings right away?', ['gpupdate /force', 'gpresult /r', 'netstat', 'tasklist'], 0, 'gpupdate refreshes policy; gpresult shows what applied.'],
      ['c2o', 'Which file system do Windows system drives use?', ['NTFS', 'FAT32', 'ext4', 'APFS'], 0, 'NTFS supports permissions, encryption and large files.'],
      ['c2o', 'Which file system works on both Windows and macOS for big USB drives?', ['exFAT', 'NTFS', 'ext4', 'APFS'], 0, 'exFAT has no 4 GB file limit and is read and written by both.'],
      ['c2o', 'Which Windows edition can’t join a corporate domain?', ['Home', 'Pro', 'Enterprise', 'Education'], 0, 'Home lacks domain join, Group Policy and BitLocker management.'],
      ['c2o', 'GPT partitioning, compared with MBR:', ['Supports disks over 2 TB and many more partitions', 'Only works on USB drives', 'Is older and simpler', 'Can’t boot Windows'], 0, 'GPT goes with UEFI; MBR is limited to 2 TB and four primary partitions.'],
      ['c2o', 'Which Linux command changes a file’s permissions?', ['chmod', 'chown', 'ls', 'grep'], 0, 'chmod changes permissions; chown changes the owner.'],
      ['c2o', 'Which Linux command runs another command as the superuser?', ['sudo', 'su -l', 'passwd', 'top'], 0, 'sudo runs one command with elevated rights.'],
      ['c2o', 'Which macOS feature backs up to an external drive automatically?', ['Time Machine', 'FileVault', 'Spotlight', 'Keychain'], 0, 'Time Machine makes hourly backups; FileVault encrypts the disk.'],
      ['c2o', 'Which macOS feature encrypts the whole disk?', ['FileVault', 'Time Machine', 'Gatekeeper', 'Mission Control'], 0, 'FileVault is macOS full-disk encryption.'],
      ['c2o', 'Where do you see Windows error and warning logs?', ['Event Viewer', 'Device Manager', 'Disk Management', 'Task Scheduler'], 0, 'Event Viewer holds the System, Application and Security logs.'],
      ['c2o', 'Where do you update or roll back a Windows driver?', ['Device Manager', 'Event Viewer', 'Services', 'Registry Editor'], 0, 'Device Manager handles drivers and devices.'],
      ['c2o', 'Windows 11 requires which security chip?', ['TPM 2.0', 'TPM 1.2', 'A fingerprint reader', 'No chip'], 0, 'Windows 11 needs TPM 2.0 and Secure Boot capability.'],
      ['c2o', 'Which tool shows which apps run at startup in Windows 10/11?', ['Task Manager (Startup tab)', 'Disk Management', 'Device Manager', 'Event Viewer'], 0, 'Task Manager’s Startup tab enables and disables startup apps.'],
      // ---------------- Core 2: security
      ['c2s', 'Someone follows an employee through a secure door without badging in. That’s:', ['Tailgating', 'Phishing', 'Shoulder surfing', 'Whaling'], 0, 'Tailgating (piggybacking) gets past physical security by following someone.'],
      ['c2s', 'An email pretending to be your bank asks you to log in through a link. That’s:', ['Phishing', 'Vishing', 'Tailgating', 'A DDoS attack'], 0, 'Phishing uses fake messages to steal credentials.'],
      ['c2s', 'A phishing attack aimed at a company’s CEO is called:', ['Whaling', 'Smishing', 'Vishing', 'Spoofing'], 0, 'Whaling targets high-value people like executives.'],
      ['c2s', 'Phishing by phone call is called:', ['Vishing', 'Smishing', 'Whaling', 'Pharming'], 0, 'Vishing is voice phishing; smishing is by text message.'],
      ['c2s', 'Watching someone type their PIN over their shoulder is:', ['Shoulder surfing', 'Tailgating', 'Dumpster diving', 'Spoofing'], 0, 'Privacy screens help against shoulder surfing.'],
      ['c2s', 'Malware that encrypts your files and demands payment is:', ['Ransomware', 'Spyware', 'Adware', 'A worm'], 0, 'Ransomware holds data hostage; good backups are the best defence.'],
      ['c2s', 'Malware disguised as useful software is a:', ['Trojan', 'Worm', 'Rootkit', 'Keylogger'], 0, 'Trojans pretend to be legitimate programs.'],
      ['c2s', 'Malware that hides deep in the OS to keep admin access is a:', ['Rootkit', 'Trojan', 'Adware', 'Botnet'], 0, 'Rootkits hide themselves and can be very hard to remove.'],
      ['c2s', 'A password plus a code from an authenticator app is:', ['Multifactor authentication', 'Single sign-on', 'A passphrase', 'Biometrics'], 0, 'MFA combines factors: something you know plus something you have.'],
      ['c2s', 'Giving users only the access they need to do their job is:', ['The principle of least privilege', 'Zero-day defence', 'Defence in depth', 'Single sign-on'], 0, 'Least privilege limits the damage from mistakes and compromised accounts.'],
      ['c2s', 'In the malware removal steps, what comes right after quarantining the infected system?', ['Disable System Restore', 'Educate the user', 'Schedule scans', 'Enable System Restore'], 0, 'Investigate, quarantine, disable System Restore, remediate, schedule scans and update, re-enable System Restore, educate.'],
      ['c2s', 'What is the last step of the malware removal process?', ['Educate the end user', 'Disable System Restore', 'Remediate the system', 'Quarantine the system'], 0, 'Teaching the user helps stop it happening again.'],
      ['c2s', 'Degaussing destroys data on which kind of drive?', ['Magnetic hard drives', 'SSDs', 'USB flash drives', 'DVDs'], 0, 'A degausser scrambles magnetic media; SSDs need shredding or secure erase.'],
      ['c2s', 'Which Windows feature encrypts individual files and folders on NTFS?', ['EFS', 'BitLocker', 'FileVault', 'UAC'], 0, 'EFS encrypts files; BitLocker encrypts whole volumes.'],
      ['c2s', 'On a new SOHO router, what should you change first?', ['The default admin password', 'The Wi-Fi channel', 'The router’s colour scheme', 'The DHCP range'], 0, 'Default credentials are public knowledge.'],
      ['c2s', 'Why disable WPS on a wireless router?', ['Its PIN can be brute-forced', 'It slows Wi-Fi down', 'It uses too much power', 'It blocks guests'], 0, 'WPS PIN mode is vulnerable to brute-force attacks.'],
      // ---------------- Core 2: software troubleshooting
      ['c2t', 'A browser keeps redirecting to strange sites and showing pop-ups. Most likely?', ['Malware or adware', 'A failing hard drive', 'Low memory', 'A bad network cable'], 0, 'Redirects and pop-ups are classic signs of browser malware.'],
      ['c2t', 'Windows blue-screens right after a driver update. Best fix?', ['Boot to Safe Mode and roll back the driver', 'Replace the motherboard', 'Reinstall all apps', 'Change the wallpaper'], 0, 'Roll back the change that caused it.'],
      ['c2t', 'A PC takes ages to start up. A good first step?', ['Disable unneeded startup programs', 'Replace the CPU', 'Format the drive', 'Turn off the firewall'], 0, 'Too many startup apps slow boot times.'],
      ['c2t', 'Every secure site shows certificate warnings on one PC. Check first:', ['The system date and time', 'The monitor resolution', 'The printer queue', 'The mouse driver'], 0, 'A wrong clock makes valid certificates look expired or not yet valid.'],
      ['c2t', 'An app says a DLL file is missing. A good fix?', ['Reinstall or repair the application', 'Defragment the disk', 'Replace the RAM', 'Change the DNS server'], 0, 'Reinstalling puts the app’s files back.'],
      ['c2t', 'A phone’s battery drains fast after installing a new app. What to check?', ['Battery usage by app, then remove that app', 'The screen protector', 'The SIM card', 'The case'], 0, 'The battery settings show which app is using power.'],
      ['c2t', 'Windows won’t start after an update. Which tool can help?', ['Startup Repair or System Restore in WinRE', 'Disk Cleanup', 'Paint', 'Device Manager'], 0, 'The recovery environment can repair startup or roll back changes.'],
      ['c2t', 'A mobile app keeps crashing. First thing to try?', ['Force-close it, clear its cache, update it', 'Factory-reset the phone', 'Replace the battery', 'Turn off cellular'], 0, 'Start with the least drastic fix.'],
      ['c2t', 'Files have been renamed with strange extensions and a ransom note appears. First action?', ['Disconnect it from the network', 'Pay the ransom', 'Restart repeatedly', 'Email the note to coworkers'], 0, 'Isolate it so it can’t spread, then follow the incident response plan.'],
      ['c2t', 'A user gets "Access denied" opening a shared folder they could open yesterday. Likely cause?', ['Their permissions were changed', 'The monitor failed', 'The CPU is overheating', 'The mouse is unplugged'], 0, 'Check the share and NTFS permissions and group membership.'],
      // ---------------- Core 2: operational procedures
      ['c2p', 'What protects components from static when you work inside a PC?', ['An antistatic (ESD) wrist strap', 'Rubber gloves', 'A magnet', 'A surge protector'], 0, 'The strap keeps you at the same potential as the PC so no static discharges.'],
      ['c2p', 'Where do you find how to safely handle and dispose of toner?', ['Its Safety Data Sheet (SDS)', 'The printer’s warranty', 'The Windows help', 'A user manual for the PC'], 0, 'The SDS covers handling, hazards and disposal.'],
      ['c2p', 'The 3-2-1 backup rule is:', ['3 copies, on 2 kinds of media, 1 off-site', '3 backups a day, 2 a week, 1 a month', '3 drives in RAID, 2 spares, 1 cloud', '3 users, 2 passwords, 1 admin'], 0, 'It protects against hardware failure and site disasters.'],
      ['c2p', 'An incremental backup copies:', ['Changes since the last backup of any kind', 'Changes since the last full backup', 'Everything, every time', 'Only system files'], 0, 'Incremental: since the last backup. Differential: since the last full.'],
      ['c2p', 'A differential backup copies:', ['Changes since the last full backup', 'Changes since the last backup of any kind', 'Everything, every time', 'Only new files today'], 0, 'Differentials grow until the next full backup.'],
      ['c2p', 'Before a major change to a company’s systems, change management needs:', ['An approved request with a rollback plan', 'Only the technician’s say-so', 'A new computer', 'The users’ passwords'], 0, 'The change advisory board approves; a backout plan is ready.'],
      ['c2p', 'Tracking who handled evidence and when is called:', ['Chain of custody', 'Change management', 'Least privilege', 'An SLA'], 0, 'It proves evidence wasn’t tampered with.'],
      ['c2p', 'What does a UPS do?', ['Keeps equipment running on battery during a power cut', 'Speeds up the network', 'Cools the server room', 'Backs up files'], 0, 'An uninterruptible power supply bridges outages and conditions power.'],
      ['c2p', 'Which file extension is a PowerShell script?', ['.ps1', '.sh', '.bat', '.py'], 0, '.ps1 is PowerShell, .sh a shell script, .bat a Windows batch file, .py Python.'],
      ['c2p', 'The right way to lift a heavy server?', ['Bend your knees and lift with your legs', 'Bend at the waist', 'Twist as you lift', 'Lift it alone, quickly'], 0, 'Lift with your legs, keep your back straight, get help for heavy loads.'],
      ['c2p', 'A customer is frustrated. Good professional practice?', ['Listen, don’t interrupt, restate the problem', 'Argue the point', 'Take a personal call', 'Blame the user'], 0, 'Active listening and a calm manner.'],
      ['c2p', 'What is PII?', ['Personally identifiable information', 'Private internet interface', 'Primary IP information', 'Printer ink indicator'], 0, 'Names, addresses, ID numbers and more: protect it.'],
    ];
    const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];
    // a question, its answers shuffled: { d, q, a, c, why }
    function shuffled(item, rand) {
      const [d, q, ans, c, why] = item;
      const order = [0, 1, 2, 3].sort(() => rand() - 0.5);
      return { d, q, a: order.map((i) => ans[i]), c: order.indexOf(c), why };
    }
    // the study log: right/wrong per domain, and per question (so weak spots come up more)
    const log = () => { prefs.study = prefs.study && typeof prefs.study === 'object' ? prefs.study : {}; const s = prefs.study; s.dom = s.dom || {}; s.q = s.q || {}; return s; };
    function mark(item, ok) {
      const s = log(), d = item.d, k = String(Q.findIndex((x) => x[1] === item.q));
      s.dom[d] = s.dom[d] || [0, 0]; s.dom[d][ok ? 0 : 1] += 1;
      s.q[k] = s.q[k] || [0, 0]; s.q[k][ok ? 0 : 1] += 1;
      savePrefs();
    }
    // the next question: by exam weight, or (weak spots) toward the domains and questions you miss
    function next(mode, rand, recent) {
      const s = log();
      let pool = Q.filter((x) => (mode === 'c1' ? x[0].startsWith('c1') : mode === 'c2' ? x[0].startsWith('c2') : true));
      if (!pool.length) pool = Q.slice();
      const fresh = pool.filter((x) => !recent.includes(x[1]));
      if (fresh.length) pool = fresh;
      // choose a domain first, weighted by the exam (or by how often you miss it)
      const doms = [...new Set(pool.map((x) => x[0]))];
      const wOf = (d) => { if (mode !== 'weak') return DOMAINS[d].w; const r = s.dom[d] || [0, 0]; return 4 + 40 * ((r[1] + 1) / (r[0] + r[1] + 2)); };
      let tot = doms.reduce((a, d) => a + wOf(d), 0), r = rand() * tot, dom = doms[0];
      for (const d of doms) { r -= wOf(d); if (r <= 0) { dom = d; break; } }
      const inDom = pool.filter((x) => x[0] === dom);
      if (mode !== 'weak') return shuffled(pick(inDom, rand), rand);
      // weak spots: questions missed before come up more
      const qw = (x) => { const e = s.q[String(Q.indexOf(x))] || [0, 0]; return 1 + 3 * e[1] - Math.min(0.8, e[0] * 0.2); };
      tot = inDom.reduce((a, x) => a + qw(x), 0); r = rand() * tot;
      for (const x of inDom) { r -= qw(x); if (r <= 0) return shuffled(x, rand); }
      return shuffled(inDom[0], rand);
    }
    // ports and protocols (Core 1, 2.1)
    const PORTS = [
      [20, 'FTP (data)'], [21, 'FTP (control)'], [22, 'SSH'], [23, 'Telnet'], [25, 'SMTP'], [53, 'DNS'], [67, 'DHCP (server)'], [68, 'DHCP (client)'],
      [80, 'HTTP'], [110, 'POP3'], [137, 'NetBIOS name'], [139, 'NetBIOS session'], [143, 'IMAP'], [161, 'SNMP'], [389, 'LDAP'], [443, 'HTTPS'], [445, 'SMB'], [3389, 'RDP'],
    ];
    // connectors and cables: [name, what it's for]
    const CONNECTORS = [
      ['RJ45', 'Ethernet (twisted pair)'], ['RJ11', 'Telephone / DSL line'], ['F-type', 'Coax: cable modem and TV'], ['BNC', 'Coax: older networks and video'],
      ['LC', 'Fiber optic (small, latching)'], ['SC', 'Fiber optic (square, push-pull)'], ['ST', 'Fiber optic (round, twist-lock)'], ['USB-C', 'Reversible USB: data, power, video'],
      ['Lightning', 'Older Apple iPhones and iPads'], ['HDMI', 'Digital video and audio to TVs and monitors'], ['DisplayPort', 'Digital video to monitors (PC)'], ['VGA', 'Analog video (old monitors)'],
      ['DVI', 'Digital (and some analog) video'], ['SATA', 'Internal drives: data'], ['Molex', 'Old 4-pin drive power'], ['eSATA', 'External SATA drives'],
      ['Punchdown block', 'Terminating wires on a patch panel'], ['Thunderbolt', 'High-speed data and video (USB-C shaped)'],
    ];
    // Wi-Fi standards: [standard, what it is]
    const WIFI = [
      ['802.11a', '5 GHz, up to 54 Mbps'], ['802.11b', '2.4 GHz, up to 11 Mbps'], ['802.11g', '2.4 GHz, up to 54 Mbps'],
      ['802.11n', 'Wi-Fi 4: 2.4 and 5 GHz, MIMO'], ['802.11ac', 'Wi-Fi 5: 5 GHz, MU-MIMO'], ['802.11ax', 'Wi-Fi 6/6E: 2.4, 5 (and 6) GHz'],
    ];
    return { DOMAINS, Q, PORTS, CONNECTORS, WIFI, next, mark, log, shuffled };
  })();

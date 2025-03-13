#!/bin/bash

scp html/* root@abesdomainexpansion.com.mooo.com:/var/www/html/
scp html/assets/images/ root@abesdomainexpansion.com.mooo.com:/var/www/html/
scp jsapp/* root@abesdomainexpansion.com.mooo.com:/var/www/jsapp/
ssh root@abesdomainexpansion.com.mooo.com systemctl restart jsapp



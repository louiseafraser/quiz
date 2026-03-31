///      NOTES      ///
This droplet is 142.93.33.159 and is linked to URL https://myjob.cosla.gov.uk/ with SSL certificate

UPDATE QUIZ
If changing anything within the files, in order to update the droplet:
1. Login to Digital Ocean
2. Open the droplet for the quiz
3. Run update code:

cd /var/www/html
./deploy.sh





OTHER CODE - NEEDS UPDATED DOMAIN:

sudo rm -rf /var/www/html/*
sudo git clone https://github.com/louiseafraser/fslt-quiz.git .

cd /var/www/html
sudo rm index.nginx-debian.html  # remove default page
sudo git clone https://github.com/louiseafraser/fslt-quiz.git .

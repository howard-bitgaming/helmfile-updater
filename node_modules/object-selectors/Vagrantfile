# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  
  # Expose port 9229 to allow debugging
  config.vm.network :forwarded_port, guest: 9229, host: 9229

  # Install NodeJS
  config.vm.provision "shell", name: "Install Node.JS", inline: <<-SHELL
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
  SHELL

  # Make Gulp use polling when file-watching
  config.vm.provision "shell", name: "Set Gulp watch to use polling", inline: <<-SHELL
    echo "export GULP_WATCH_POLLING=true" > /etc/profile.d/gulp-watch-polling.sh
  SHELL

  # cd to the /vagrant directory upon login
  config.ssh.extra_args = ["-t", "cd /vagrant; bash --login"]
end

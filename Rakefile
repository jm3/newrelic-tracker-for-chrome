desc "package up a clean chrome extension for distro, minus development files"
task :package => :environment do
  puts "Packaging for upload to the Chrome Extension portal..."
  puts

  print "Have you checked in any pending changes and bumped the version number? [yN] "
  continue = gets.strip
  exit 1 unless continue == "y" or continue == "Y"

  # TODO: don't allow this to run if there are uncommited changes

  project = "chrome-relic"
  project_dir = File.expand_path( ".")
  developer_files = %w[.gitignore Rakefile README.md images/screenshot-setup.png images/screenshot-stats.png images/ui.psd]

  # remove any development files that should not be packaged for upload;
  # we'll recover them with git in a second
  developer_files.map{ |d| File.delete( d )  rescue nil }
  `rm *.zip`
  FileUtils.mv ".git", "../GIT" rescue nil

  # cache current revision of code + extension as JS strings for usage tracking
  ext_version = `grep version manifest.json | awk '{print $2}'`.gsub(/"|,/, "").chomp
  `echo '/* AUTO-GENERATED FILE; DO NOT EDIT */' > js/versions.js`
  `echo "var git_version = '\`git rev-parse --short HEAD\`';" >> js/versions.js`
  `echo "var ext_version = '#{ext_version}';" >> js/versions.js`

  # package directory for upload into a numbered zip
  Dir.chdir( ".." )
  puts `find #{project} -type f | egrep -v "DS_Store|\.swp|KEYS" | zip -@ "#{project}-#{ext_version}.zip"`
  
  # restore what hath been deleted
  Dir.chdir( project_dir  )
  FileUtils.mv "../GIT", ".git" rescue nil
  FileUtils.mv "../#{project}-#{ext_version}.zip", "."
  `git co .gitignore Rakefile README.md images/`

end

Rake::Task[:package].prerequisites.clear
task :default => [:package]

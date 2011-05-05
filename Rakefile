desc "package up a clean chrome extension for distro, minus development files"
task :package => :environment do
  puts "packaging for upload to the developer portal"

  project = "chrome-relic"
  project_dir = File.expand_path( ".")
  developer_files = %w[.gitignore README.markdown images/screenshot-setup.png images/screenshot-stats.png images/ui.psd]
  version = `grep version manifest.json | awk '{print $2}'`.gsub(/"|,/, "").chomp

  developer_files.map{ |d| File.delete( d )  rescue nil }
  FileUtils.mv ".git", "../GIT" rescue nil

  Dir.chdir( ".." )
  puts `find #{project} -type f | egrep -v "DS_Store|\.swp|KEYS" | zip -@ "#{project}-#{version}.zip"`
  
  Dir.chdir( project_dir  )
  FileUtils.mv "../GIT", ".git" rescue nil
  FileUtils.mv "../#{project}-#{version}.zip", "."
  `git co .gitignore README.markdown images/`
end

Rake::Task[:package].prerequisites.clear
task :default => [:package]

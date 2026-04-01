export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="arc-panel-strong rounded-[28px] p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-[#8d9ab5]">
              ArcUnzip is part of the arcnode.dev network.
            </p>
          </div>

          <div className="space-y-6 text-sm leading-7 text-[#d7deee]">
            <section>
              <h2 className="text-lg font-semibold text-white">Overview</h2>
              <p className="mt-2">
                ArcUnzip helps users inspect ZIP archives directly in the browser.
                We do not sell personal data, we do not profile users, and we do not
                intentionally store uploaded archive contents as part of the normal product experience.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">What We Store</h2>
              <p className="mt-2">
                We do not store the contents of the files you open in ArcUnzip during normal usage.
                Uploaded ZIP data is processed only to enable browsing, previewing, and searching within your active session.
              </p>
              <p className="mt-2">
                In plain terms: we do not keep a database of your uploaded archives, extracted files,
                messages, text, images, or document contents.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Uploaded Files</h2>
              <p className="mt-2">
                Files you choose to open are used only to provide the app’s functionality.
                We do not claim ownership over your files or their contents.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Analytics and Logs</h2>
              <p className="mt-2">
                Basic hosting-level logs may exist for reliability, security, and abuse prevention.
                These logs are not used to build a retained archive of your uploaded file contents.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Third-Party Services</h2>
              <p className="mt-2">
                ArcUnzip may rely on infrastructure providers to deliver the site. Those providers may process
                technical request data such as IP address, browser details, and connection metadata.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Data Security</h2>
              <p className="mt-2">
                We aim to minimize data handling wherever possible by avoiding unnecessary retention and by not
                storing archive contents as part of the normal browsing experience.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Changes</h2>
              <p className="mt-2">
                This policy may be updated from time to time to reflect changes in the service.
                Any updated version will be published on this page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Contact</h2>
              <p className="mt-2">
                For questions about privacy or the wider ArcNode ecosystem, please refer to arcnode.dev.
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

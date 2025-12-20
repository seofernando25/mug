/**
 * Prints the content of an HTML element in a new window.
 * @param element The element containing the content to print.
 * @param title The title of the document.
 */
export function printElement(element: HTMLElement | null, title: string) {
	if (!element) return;

	const printWindow = window.open('', '_blank');
	if (!printWindow) {
		alert('Please allow popups to print this document.');
		return;
	}

	const content = element.innerHTML;

	printWindow.document.write(`
		<!DOCTYPE html>
		<html>
			<head>
				<title>${title}</title>
				<style>
					body {
						font-family: system-ui, -apple-system, sans-serif;
						padding: 40px;
						color: #1a1a1a;
						line-height: 1.6;
						max-width: 800px;
						margin: 0 auto;
					}
					h1 {
						font-size: 2.5rem;
						font-weight: 800;
						margin-bottom: 1rem;
						color: #000;
						border-bottom: 2px solid #eaeaea;
						padding-bottom: 0.5rem;
					}
					h2 {
						font-size: 1.5rem;
						font-weight: 700;
						margin-top: 2.5rem;
						margin-bottom: 1rem;
						color: #333;
						text-transform: uppercase;
						letter-spacing: 0.05em;
					}
					p {
						margin-bottom: 1rem;
					}
					ul, ol {
						margin-bottom: 1.5rem;
						padding-left: 1.5rem;
					}
					li {
						margin-bottom: 0.5rem;
					}
					strong {
						font-weight: 700;
					}
					.hidden-from-view {
						display: block !important;
						visibility: visible !important;
					}
					@media print {
						body { padding: 0; }
						@page { margin: 2cm; }
					}
				</style>
			</head>
			<body>
				${content}
				<script>
					// Wait for content to be parsed
					setTimeout(() => {
						window.print();
						// Close the window after printing dialog is closed
						// Some browsers might close it immediately, others wait
						window.onafterprint = () => window.close();
					}, 250);
				</script>
			</body>
		</html>
	`);

	printWindow.document.close();
}
